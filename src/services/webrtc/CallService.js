// local-pulse-app/src/services/webrtc/CallService.js

// react-native-webrtc is a NATIVE module: it only exists in a custom dev client
// / EAS build, never in Expo Go. Importing it at module top means that if the
// running binary wasn't built with it, the WHOLE app crashes at launch the
// moment anything imports CallService (e.g. CallProvider mounting). Load it
// lazily instead: the app always boots, and we only surface a clear error if
// the user actually tries to place a call without the native module present.
let RTC = null;
function webrtc() {
  if (RTC) return RTC;
  try {
    // eslint-disable-next-line global-require
    RTC = require("react-native-webrtc");
  } catch (e) {
    throw new Error(
      "react-native-webrtc is not in this build. Rebuild the dev client " +
        "(npx expo prebuild --clean && npx expo run:ios) — it can't run in Expo Go.",
    );
  }
  return RTC;
}

/**
 * Thin, transport-agnostic wrapper around a single 1:1 RTCPeerConnection.
 *
 * Knows nothing about sockets, React or navigation — it emits events and the
 * CallContext wires them to the signaling channel. That separation is what
 * makes it possible to swap in a managed SDK (LiveKit, Daily) later by
 * reimplementing this one file.
 *
 * IMPORTANT: react-native-webrtc requires a custom dev client / EAS build.
 * It does not work in Expo Go.
 *
 * Events emitted:
 *   'localStream'        (MediaStream)
 *   'remoteStream'       (MediaStream)
 *   'iceCandidate'       (RTCIceCandidate JSON)
 *   'connectionState'    ('connecting' | 'connected' | 'reconnecting' | 'failed' | 'closed')
 *   'error'              (Error)
 */

const DEFAULT_CONSTRAINTS = {
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

class CallService {
  constructor() {
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.listeners = new Map();
    this.pendingCandidates = [];
    this.hasRemoteDescription = false;
    this.isFrontCamera = true;
    this.usedRelay = false;
    this.media = "video";
  }

  // ------------------------------------------------------------------
  // Minimal event emitter
  // ------------------------------------------------------------------
  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`[CallService] listener for "${event}" threw`, error);
      }
    });
  }

  // ------------------------------------------------------------------
  // Media
  // ------------------------------------------------------------------
  async startLocalStream(media = "video") {
    this.media = media;

    const constraints = {
      audio: DEFAULT_CONSTRAINTS.audio,
      video: media === "video" ? DEFAULT_CONSTRAINTS.video : false,
    };

    const stream = await webrtc().mediaDevices.getUserMedia(constraints);
    this.localStream = stream;
    this.isFrontCamera = true;
    this.emit("localStream", stream);
    return stream;
  }

  // ------------------------------------------------------------------
  // Peer connection
  // ------------------------------------------------------------------
  createPeerConnection(iceServers = []) {
    const RTCPeerConnection = webrtc().RTCPeerConnection;
    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 4,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });

    pc.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        this.emit(
          "iceCandidate",
          event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
        );
      }
    });

    pc.addEventListener("track", (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      this.remoteStream = stream;
      this.emit("remoteStream", stream);
    });

    pc.addEventListener("connectionstatechange", () => {
      switch (pc.connectionState) {
        case "connected":
          this.detectRelay();
          this.emit("connectionState", "connected");
          break;
        case "connecting":
          this.emit("connectionState", "connecting");
          break;
        case "disconnected":
          // Often transient on mobile (wifi <-> LTE handover). Surface it as
          // reconnecting rather than tearing the call down immediately.
          this.emit("connectionState", "reconnecting");
          break;
        case "failed":
          this.emit("connectionState", "failed");
          break;
        case "closed":
          this.emit("connectionState", "closed");
          break;
        default:
          break;
      }
    });

    pc.addEventListener("iceconnectionstatechange", () => {
      if (pc.iceConnectionState === "failed") {
        // One restart attempt before giving up.
        try {
          pc.restartIce?.();
        } catch (error) {
          this.emit("error", error);
        }
      }
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    this.pc = pc;
    return pc;
  }

  /**
   * Inspect the selected candidate pair so we can report whether media went
   * through TURN. Purely diagnostic — never blocks the call.
   */
  async detectRelay() {
    try {
      const stats = await this.pc?.getStats();
      if (!stats) return;

      let selectedPairId = null;
      stats.forEach((report) => {
        if (report.type === "transport" && report.selectedCandidatePairId) {
          selectedPairId = report.selectedCandidatePairId;
        }
      });

      stats.forEach((report) => {
        const isSelectedPair =
          report.type === "candidate-pair" &&
          (report.id === selectedPairId || report.selected || report.nominated);

        if (!isSelectedPair) return;

        stats.forEach((candidate) => {
          const matchesPair =
            candidate.id === report.localCandidateId ||
            candidate.id === report.remoteCandidateId;
          if (matchesPair && candidate.candidateType === "relay") {
            this.usedRelay = true;
          }
        });
      });
    } catch (error) {
      // Stats are best-effort.
    }
  }

  // ------------------------------------------------------------------
  // Negotiation — caller side
  // ------------------------------------------------------------------
  async createOffer() {
    if (!this.pc) throw new Error("Peer connection not initialised.");

    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.media === "video",
    });
    await this.pc.setLocalDescription(offer);

    return { type: offer.type, sdp: offer.sdp };
  }

  async applyAnswer(sdp) {
    if (!this.pc) throw new Error("Peer connection not initialised.");

    const { RTCSessionDescription } = webrtc();
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    this.hasRemoteDescription = true;
    await this.flushPendingCandidates();
  }

  // ------------------------------------------------------------------
  // Negotiation — callee side
  // ------------------------------------------------------------------
  async createAnswer(offerSdp) {
    if (!this.pc) throw new Error("Peer connection not initialised.");

    const { RTCSessionDescription } = webrtc();
    await this.pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    this.hasRemoteDescription = true;
    await this.flushPendingCandidates();

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    return { type: answer.type, sdp: answer.sdp };
  }

  // ------------------------------------------------------------------
  // ICE
  // ------------------------------------------------------------------
  async addIceCandidate(candidate) {
    if (!candidate) return;

    // Candidates routinely arrive before the remote description is set.
    // Queue them rather than throwing.
    if (!this.pc || !this.hasRemoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      const { RTCIceCandidate } = webrtc();
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      this.emit("error", error);
    }
  }

  async flushPendingCandidates() {
    const queued = this.pendingCandidates;
    this.pendingCandidates = [];

    const { RTCIceCandidate } = webrtc();
    for (const candidate of queued) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        this.emit("error", error);
      }
    }
  }

  // ------------------------------------------------------------------
  // In-call controls
  // ------------------------------------------------------------------
  setMicrophoneEnabled(enabled) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  setCameraEnabled(enabled) {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  switchCamera() {
    const [videoTrack] = this.localStream?.getVideoTracks() || [];
    if (!videoTrack?._switchCamera) return this.isFrontCamera;

    videoTrack._switchCamera();
    this.isFrontCamera = !this.isFrontCamera;
    return this.isFrontCamera;
  }

  // ------------------------------------------------------------------
  // Teardown
  // ------------------------------------------------------------------
  destroy() {
    try {
      this.localStream?.getTracks().forEach((track) => {
        track.stop();
      });
    } catch (error) {
      // Already stopped.
    }

    try {
      this.localStream?.release?.();
      this.remoteStream?.release?.();
    } catch (error) {
      // release() only exists on some platforms/versions.
    }

    try {
      this.pc?.close();
    } catch (error) {
      // Already closed.
    }

    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.pendingCandidates = [];
    this.hasRemoteDescription = false;
    this.usedRelay = false;
    this.listeners.clear();
  }
}

export default CallService;

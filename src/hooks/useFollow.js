// localpulse/app/src/hooks/useFollow.js
//
// Follow / unfollow with an optimistic update.
//
//   const { following, followerCount, busy, toggle } = useFollow({
//     userId: profile.id,
//     initialFollowing: profile.isFollowing,
//     initialFollowerCount: profile.followerCount,
//   });
//
// The state flips IMMEDIATELY and the request goes out behind it. A follow
// button that waits for a round trip feels broken on mobile — 200-400ms on
// a good connection, seconds on a bad one, and in that window the user taps
// again and now there are two requests racing.
//
// The cost of optimism is that failures must roll back, and the rollback has
// to restore what was there BEFORE the tap rather than just inverting — those
// differ if two taps overlap.

import { useCallback, useEffect, useRef, useState } from "react";

export function useFollow({
  userId,
  initialFollowing = false,
  initialFollowerCount = 0,
  // Adjust these to match your API client if the names differ.
  followFn,
  unfollowFn,
}) {
  const [following, setFollowing] = useState(Boolean(initialFollowing));
  const [followerCount, setFollowerCount] = useState(
    Number(initialFollowerCount) || 0,
  );
  const [busy, setBusy] = useState(false);

  // Re-seed when the profile loads or changes. useState initialisers run
  // once, so without this the button keeps whatever the props held on first
  // mount — usually `false` if the screen rendered before the fetch landed.
  useEffect(() => {
    setFollowing(Boolean(initialFollowing));
  }, [initialFollowing]);

  useEffect(() => {
    setFollowerCount(Number(initialFollowerCount) || 0);
  }, [initialFollowerCount]);

  // Guards against a double-tap firing two requests. A ref rather than the
  // `busy` state because state updates are async — two taps in the same tick
  // would both see busy === false.
  const inFlight = useRef(false);

  const toggle = useCallback(async () => {
    if (!userId || inFlight.current) return;

    const wasFollowing = following;
    const wasCount = followerCount;

    inFlight.current = true;
    setBusy(true);

    // Flip first. The button reads as pressed before the network is involved.
    setFollowing(!wasFollowing);
    setFollowerCount(Math.max(0, wasCount + (wasFollowing ? -1 : 1)));

    try {
      if (wasFollowing) await unfollowFn(userId);
      else await followFn(userId);
    } catch (e) {
      // Restore the captured values, not the inverse of current state — if
      // anything else moved these while the request was out, inverting would
      // leave the UI wrong in a different way.
      setFollowing(wasFollowing);
      setFollowerCount(wasCount);
      throw e;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [userId, following, followerCount, followFn, unfollowFn]);

  return { following, followerCount, busy, toggle };
}

export default useFollow;

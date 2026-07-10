// localpulse/app/src/screens/PersonalSettingsScreen.js
//
// Account identity (username, email, gender, home location) and Discovery
// preferences. Split out of SettingsScreen, which was getting long.
import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, Pressable, Alert, ScrollView, TextInput, StatusBar, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client.js';
import { useProfileStore } from '../store/profileStore.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { Row, ToggleRow, Section, settingsStyles } from '../components/SettingsRows.js';

// Fallback radius when the user turns "Anywhere" back off. Matches the
// server-side default in the User model.
const DEFAULT_DISTANCE_KM = 50;

// Own gender — a field on the User model, not a preference. Order matches the
// `GENDERS` enum in models/User.js.
const GENDER = ['male', 'female', 'other'];

// The discovery filter. `key` is the DB gender value; `label` is what shows.
const SHOW = [
    { key: 'female', label: 'Women' },
    { key: 'male', label: 'Men' },
    { key: 'everyone', label: 'Everyone' },
];

export default function PersonalSettingsScreen({ navigation }) {
    const styles = useStyles(settingsStyles);
    const insets = useSafeAreaInsets();
    const profile = useProfileStore((s) => s.profile);
    const loadProfile = useProfileStore((s) => s.loadProfile);
    const savePreferences = useProfileStore((s) => s.savePreferences);

    const [show, setShow] = useState('everyone');
    const [ageMin, setAgeMin] = useState('18');
    const [ageMax, setAgeMax] = useState('99');
    // null = "Anywhere" (no distance limit). Otherwise the km value as a string,
    // because that's what TextInput needs.
    const [distance, setDistance] = useState(String(DEFAULT_DISTANCE_KM));
    const anywhere = distance === null;

    // Inline username edit
    const [usernameModal, setUsernameModal] = useState(false);
    const [usernameDraft, setUsernameDraft] = useState('');
    const [usernameSaving, setUsernameSaving] = useState(false);
    const [usernameError, setUsernameError] = useState('');

    // Inline gender edit
    const [genderEditing, setGenderEditing] = useState(false);
    const [genderSaving, setGenderSaving] = useState(false);

    // onBlur never fires when the screen unmounts, so the last edit to a
    // TextInput is lost on back. This ref lets the beforeRemove listener read
    // the current drafts without re-subscribing on every keystroke.
    const draftsRef = useRef({ ageMin, ageMax, distance });
    draftsRef.current = { ageMin, ageMax, distance };

    useEffect(() => { loadProfile(); }, [loadProfile]);
    // Refetch on focus: returning from LocationPicker changes locationName /
    // locationMode on the server, and the row below reads them.
    useEffect(
        () => navigation.addListener('focus', loadProfile),
        [navigation, loadProfile],
    );
    useEffect(() => {
        if (profile?.preferences) {
            const p = profile.preferences;
            setShow(p.show || 'everyone');
            setAgeMin(String(p.ageMin ?? 18));
            setAgeMax(String(p.ageMax ?? 99));
            setDistance(p.maxDistanceKm == null ? null : String(p.maxDistanceKm));
        }
    }, [profile]);

    // Flush pending TextInput edits before the screen goes away — beforeRemove
    // fires while still mounted, and covers gestures and hardware back too.
    // Compares against the loaded profile so we don't POST on every back-press.
    // Calls savePreferences directly rather than savePrefs: an Alert on failure
    // would fire against a screen that no longer exists.
    useEffect(
        () => navigation.addListener('beforeRemove', () => {
            const p = profile?.preferences;
            if (!p) return;
            const { ageMin: a, ageMax: b, distance: d } = draftsRef.current;

            const patch = {};
            const nMin = Number(a);
            const nMax = Number(b);
            if (Number.isFinite(nMin) && nMin !== p.ageMin) patch.ageMin = nMin;
            if (Number.isFinite(nMax) && nMax !== p.ageMax) patch.ageMax = nMax;

            // d === null means Anywhere, which the toggle already saved.
            if (d !== null) {
                const nDist = Number(d);
                if (Number.isFinite(nDist) && nDist >= 1 && nDist !== p.maxDistanceKm) {
                    patch.maxDistanceKm = nDist;
                }
            }

            if (Object.keys(patch).length) savePreferences(patch).catch(() => { });
        }),
        [navigation, profile, savePreferences],
    );

    function openUsernameEdit() {
        setUsernameDraft(profile?.username || '');
        setUsernameError('');
        setUsernameModal(true);
    }

    async function saveUsername() {
        const uname = usernameDraft.trim();
        setUsernameError('');
        if (uname.length < 3 || uname.length > 24) {
            setUsernameError('Username must be 3 to 24 characters.');
            return;
        }
        if (uname === profile?.username) { setUsernameModal(false); return; }
        setUsernameSaving(true);
        try {
            await api.updateMyProfile({ username: uname });
            await loadProfile();
            setUsernameModal(false);
        } catch (e) {
            setUsernameError(e?.message ?? 'Could not change username.');
        } finally {
            setUsernameSaving(false);
        }
    }

    // Gender lives on the profile, not in preferences — so this goes through
    // updateMyProfile and needs an explicit reload, unlike the savePrefs rows.
    async function saveGender(value) {
        setGenderSaving(true);
        try {
            await api.updateMyProfile({ gender: value });
            await loadProfile();
            setGenderEditing(false);
        } catch (e) {
            Alert.alert('Error', e?.message ?? 'Could not change gender.');
        } finally {
            setGenderSaving(false);
        }
    }

    async function savePrefs(patch) {
        try {
            await savePreferences(patch);
        } catch (e) {
            Alert.alert('Error', e.message);
        }
    }

    // Toggling "Anywhere" writes null (no limit) or restores the default radius.
    // Sending null rather than 0 keeps the meaning explicit in the DB and lets
    // $geoNear omit maxDistance entirely.
    function toggleAnywhere(on) {
        if (on) {
            setDistance(null);
            savePrefs({ maxDistanceKm: null });
        } else {
            setDistance(String(DEFAULT_DISTANCE_KM));
            savePrefs({ maxDistanceKm: DEFAULT_DISTANCE_KM });
        }
    }

    // Guard the blur handler: an empty or nonsense field would send NaN, which
    // Mongoose casts to a validation error rather than silently ignoring.
    function saveDistance() {
        const n = Number(distance);
        if (!Number.isFinite(n) || n < 1) {
            setDistance(String(profile?.preferences?.maxDistanceKm ?? DEFAULT_DISTANCE_KM));
            return;
        }
        savePrefs({ maxDistanceKm: n });
    }

    // Same guard as saveDistance: an empty field is Number('') === 0, not
    // "unchanged", so it would silently write ageMin: 0.
    function saveAge(which, raw) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 18 || n > 120) {
            const fallback = String(profile?.preferences?.[which] ?? (which === 'ageMin' ? 18 : 99));
            if (which === 'ageMin') setAgeMin(fallback); else setAgeMax(fallback);
            return;
        }
        savePrefs({ [which]: n });
    }

    function cycleShow() {
        const idx = SHOW.findIndex((s) => s.key === show);
        const next = SHOW[(idx + 1) % SHOW.length];
        setShow(next.key);
        savePrefs({ show: next.key });
    }

    const showLabel = SHOW.find((s) => s.key === show)?.label ?? 'Everyone';

    return (
        <View style={styles.screen}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ScreenHeader title="Personal settings" onBack={() => navigation.goBack()} />

            <ScrollView
                style={styles.root}
                contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: insets.bottom + theme.spacing(10) }}
            >
                {/* Account */}
                <Section title="ACCOUNT">
                    <Row label="Username" value={profile?.username || '—'} onPress={openUsernameEdit} last={false} />

                    {/* Not a <Row>: the chip picker expands inline, so the row becomes a
              column and the label stays anchored above it. */}
                    <View style={[styles.row, styles.rowDivider, genderEditing && styles.rowColumn]}>
                        <View style={styles.genderHeader}>
                            <Text style={styles.rowLabel}>Gender</Text>
                            {genderEditing ? (
                                <Pressable onPress={() => setGenderEditing(false)}>
                                    <Text style={styles.rowValue}>Cancel</Text>
                                </Pressable>
                            ) : (
                                <Pressable onPress={() => setGenderEditing(true)} style={styles.rowRight}>
                                    <Text style={styles.rowValue}>{profile?.gender || '—'}</Text>
                                    <Text style={styles.chevron}>›</Text>
                                </Pressable>
                            )}
                        </View>
                        {genderEditing && (
                            <View style={styles.genderRow}>
                                {GENDER.map((g) => {
                                    const selected = profile?.gender === g;
                                    return (
                                        <Pressable
                                            key={g}
                                            style={[styles.genderChip, selected && styles.genderChipActive]}
                                            onPress={() => saveGender(g)}
                                            disabled={genderSaving}
                                        >
                                            <Text style={[styles.genderChipText, selected && styles.genderChipTextActive]}>{g}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    <Row
                        label="Email"
                        value={profile?.email || '—'}
                        onPress={() => navigation.navigate('ChangeEmail')}
                        last={false}
                    />
                   <Row label="Change PIN" onPress={() => navigation.navigate('ChangePin')} last={false} />
                    {/* Where you appear to be. Browsing elsewhere is on the Discover header. */}
                    <Row
                        label="Your location"
                        value={
                            profile?.locationMode === 'manual'
                                ? (profile?.locationName || 'Set manually')
                                : 'Using GPS'
                        }
                        onPress={() => navigation.navigate('LocationPicker', { mode: 'home' })}
                        last
                    />
                </Section>

                {/* Discovery */}
                <Section title="DISCOVERY">
                    <Row label="Show me" value={showLabel} onPress={cycleShow} last={false} />
                    <View style={[styles.row, styles.rowDivider]}>
                        <Text style={styles.rowLabel}>Age range</Text>
                        <View style={styles.rangeRight}>
                            <TextInput
                                style={styles.rangeInput}
                                value={ageMin}
                                onChangeText={setAgeMin}
                                onBlur={() => saveAge('ageMin', ageMin)}
                                keyboardType="number-pad"
                            />
                            <Text style={styles.rangeDash}>–</Text>
                            <TextInput
                                style={styles.rangeInput}
                                value={ageMax}
                                onChangeText={setAgeMax}
                                onBlur={() => saveAge('ageMax', ageMax)}
                                keyboardType="number-pad"
                            />
                        </View>
                    </View>

                    <ToggleRow
                        label="Anywhere"
                        sublabel="Show people at any distance"
                        value={anywhere}
                        onValueChange={toggleAnywhere}
                        last={anywhere}
                    />

                    {/* Hidden entirely when "Anywhere" is on — a number-pad field has no
              way to represent "no limit", and leaving it visible-but-disabled
              would just look broken. */}
                    {!anywhere && (
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Max distance (km)</Text>
                            <TextInput
                                style={styles.rangeInput}
                                value={distance}
                                onChangeText={setDistance}
                                onBlur={saveDistance}
                                keyboardType="number-pad"
                            />
                        </View>
                    )}
                </Section>
            </ScrollView>

            <Modal visible={usernameModal} transparent animationType="fade" onRequestClose={() => setUsernameModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Change username</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={usernameDraft}
                            onChangeText={setUsernameDraft}
                            autoCapitalize="none"
                            autoFocus
                            placeholder="Username"
                            placeholderTextColor={theme.colors.textDim}
                            selectionColor={theme.colors.accent}
                        />
                        {!!usernameError && <Text style={styles.modalError}>{usernameError}</Text>}
                        <View style={styles.modalBtns}>
                            <Pressable onPress={() => setUsernameModal(false)}>
                                <Text style={styles.modalCancel}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalSave, usernameDraft.trim().length < 3 && styles.modalSaveDisabled]}
                                onPress={usernameDraft.trim().length >= 3 && !usernameSaving ? saveUsername : undefined}
                            >
                                {usernameSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Save</Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, TextInput, Modal, FlatList, ActivityIndicator,
  Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext.js';
import { useLang } from '../context/LangContext.js';
import { api } from '../api/client.js';
import { theme } from '../theme/theme.js';

const C = theme.colors;

const LANGUAGES = [
  { code: 'no', flag: '🇳🇴', label: 'Norsk' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'sv', flag: '🇸🇪', label: 'Svenska' },
  { code: 'da', flag: '🇩🇰', label: 'Dansk' },
  { code: 'fi', flag: '🇫🇮', label: 'Suomi' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'pl', flag: '🇵🇱', label: 'Polski' },
  { code: 'pt', flag: '🇵🇹', label: 'Português' },
];

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const DOB_YEARS = Array.from({ length: 83 }, (_, i) => String(CURRENT_YEAR - 18 - i));
function daysInMonth(year, monthIdx) { return new Date(Number(year), monthIdx + 1, 0).getDate(); }

function GenderIcon({ type, active, color, size = 44 }) {
  if (type === 'female')
    return (
      <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
        <Circle cx="22" cy="11" r="7" stroke={color} strokeWidth="2.2" fill={active ? 'rgba(255,255,255,0.25)' : 'none'} />
        <Path d="M15 10 Q14 5 18 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M29 10 Q30 5 26 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M10 38 Q10 26 22 26 Q34 26 34 38" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill={active ? 'rgba(255,255,255,0.15)' : 'none'} />
        <Path d="M16 26 Q14 32 12 38 M28 26 Q30 32 32 38" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </Svg>
    );
  if (type === 'male')
    return (
      <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
        <Circle cx="22" cy="11" r="7" stroke={color} strokeWidth="2.2" fill={active ? 'rgba(255,255,255,0.25)' : 'none'} />
        <Path d="M10 38 Q10 26 22 26 Q34 26 34 38" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill={active ? 'rgba(255,255,255,0.15)' : 'none'} />
        <Path d="M19 26 L22 30 L25 26" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <Circle cx="22" cy="11" r="7" stroke={color} strokeWidth="2.2" fill={active ? 'rgba(255,255,255,0.25)' : 'none'} />
      <Path d="M19 8 Q19 6 22 6 Q25 6 25 9 Q25 11 22 12 L22 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="22" cy="16.5" r="1" fill={color} />
      <Path d="M10 38 Q10 26 22 26 Q34 26 34 38" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill={active ? 'rgba(255,255,255,0.15)' : 'none'} />
    </Svg>
  );
}

function Field({ label, value, onChangeText, keyboardType, autoCapitalize = 'none' }) {
  return (
    <View style={{ width: '100%', marginBottom: 22 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.fieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={C.textDim}
        selectionColor={C.accent}
      />
      <View style={s.fieldLine} />
    </View>
  );
}

function ListPicker({ label, value, options, unit, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.metricLabel}>{label}</Text>
      <TouchableOpacity style={[s.dropTrigger, open && { borderColor: C.accent }]} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={{ color: value ? C.text : C.textDim, fontSize: 16, fontWeight: '600' }}>
          {value ? `${value}${unit ?? ''}` : '—'}
        </Text>
        <Text style={{ color: C.textDim, fontSize: 10 }}>▼</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={{ maxHeight: 260 }}
              showsVerticalScrollIndicator={false}
              getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
              initialScrollIndex={value ? Math.max(0, options.indexOf(value) - 2) : 0}
              renderItem={({ item }) => {
                const active = item === value;
                return (
                  <TouchableOpacity
                    style={[s.modalItem, active && { backgroundColor: C.accent + '18' }]}
                    onPress={() => { onSelect(item); setOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: active ? C.accent : C.text, fontSize: 16, fontWeight: active ? '700' : '500' }}>
                      {item}{unit ?? ''}
                    </Text>
                    {active && <Text style={{ color: C.accent, fontSize: 16 }}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function StepIndicator({ step }) {
  return (
    <View style={s.stepRow}>
      {[1, 2, 3].map((n) => (
        <React.Fragment key={n}>
          <View style={[s.stepCircle, { backgroundColor: step >= n ? C.accent : C.surface, borderColor: step >= n ? C.accent : C.border }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: step >= n ? '#fff' : C.textDim }}>{n}</Text>
          </View>
          {n < 3 && <View style={[s.stepLine, { backgroundColor: step > n ? C.accent : C.border }]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

export default function OnboardingScreen({ navigation, route }) {
  const { register, savePin, hydrate } = useAuth();
  const { t, lang, setLang } = useLang();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [tncAccepted, setTncAccepted] = useState(false);
  const [infoAccepted, setInfoAccepted] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const [gender, setGender] = useState('female');
  const [dobYear, setDobYear] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobPicker, setDobPicker] = useState(null);

  // Step 3
  const [photos, setPhotos] = useState([]); // local image uris (uploaded at finish)
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = route?.params ?? {};
    if (p.pin) setPin(p.pin);
    if (p.email) setEmail(p.email);
    if (p.username) setUsername(p.username);
    if (p.language) setLang(p.language);
    if (p.tncAccepted !== undefined) setTncAccepted(Boolean(p.tncAccepted));
    if (p.infoAccepted !== undefined) setInfoAccepted(Boolean(p.infoAccepted));
    if (p.gender) setGender(p.gender);
    if (p.step) setStep(p.step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params]);

  const MONTHS = t.months;
  const pinSet = pin.length === 4;
  const canStep1 = tncAccepted && infoAccepted && pinSet && email.trim() && username.trim();

  const dobStr = dobYear && dobMonth && dobDay ? `${dobYear}-${dobMonth}-${dobDay}` : '';
  const dobLabel = dobStr ? `${Number(dobDay)} ${MONTHS[Number(dobMonth) - 1]} ${dobYear}` : t.selectDob;

  // Navigate to the two-screen PIN flow (Choose PIN -> Confirm PIN).
  // PinConfirm navigates back to 'Onboarding' with { ...returnParams, pin },
  // which the useEffect below picks up and stores.
  const openPinEntry = () => {
    navigation.navigate('PinSetup', {
      returnTo: 'Onboarding',
      returnParams: { email, username, language: lang, tncAccepted, infoAccepted, gender, step: 1 },
    });
  };

  const advanceToStep2 = () => {
    setError('');
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email.trim())) { setError(t.emailInvalid); return; }
    if (username.trim().length < 3) { setError(t.usernameShort); return; }
    if (!pinSet) { setError(t.pinRequired); return; }
    if (!tncAccepted || !infoAccepted) { setError(t.acceptTermsRequired); return; }
    setStep(2);
  };

  // Step 2 button: validate only — no account yet. Nothing hits the server
  // until the very end (step 3), so photos are held locally until then.
  const submitStep2 = () => {
    setError('');
    if (!dobStr) { setError(t.dobRequired); return; }
    setStep(3);
  };

  // Add a photo: pick and hold the LOCAL uri. No upload yet — there's no
  // account/token until Finish. Photos upload after the account is created.
  const addPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('', t.photosOptional); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? ['images'] : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      setPhotos((prev) => [...prev, result.assets[0].uri]); // local uri
    } catch (e) {
      setError(e?.message ?? t.couldNotFinish);
    }
  };

  const removePhoto = (index) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  // Create the account with everything collected. Photos (local uris) are
  // passed so they can be uploaded once we have a token.
  const createAccount = async () => {
    await register(
      {
        email: email.trim().toLowerCase(),
        password: pin,
        pin,
        username: username.trim(),
        displayName: username.trim(),
        dob: dobStr,
        gender,
      },
      { deferUser: true },
    );
    if (savePin) { try { await savePin(pin); } catch {} }
  };

  // Finish: create account → upload the held local photos → save bio + photo
  // urls → publish the user. Everything persists here, at the true end of flow.
  const finishStep3 = async () => {
    setError('');
    setLoading(true);
    try {
      await createAccount(); // token now set on the client

      const uploadedUrls = [];
      for (const uri of photos) {
        const res = await api.uploadImage(uri);
        // uploadImage may return { url } or a bare string — normalize to string.
        const url = typeof res === 'string' ? res : res?.url;
        if (url) uploadedUrls.push(url);
      }

      const payload = {};
      if (uploadedUrls.length) payload.photos = uploadedUrls;
      if (bio.trim()) payload.bio = bio.trim();
      if (Object.keys(payload).length) {
        await api.updateMyProfile(payload); // ⚠️ match your client
      }

      await hydrate(); // publishes the finished user → navigator moves on
    } catch (e) {
      setError(e?.message ?? t.couldNotFinish);
    } finally {
      setLoading(false);
    }
  };

  // Skip: create the account with no photos/bio, then publish the user.
  const skipStep3 = async () => {
    setError('');
    setLoading(true);
    try {
      await createAccount();
      await hydrate();
    } catch (e) {
      setError(e?.message ?? t.couldNotFinish);
    } finally {
      setLoading(false);
    }
  };

  const dobOptions =
    dobPicker === 'year' ? DOB_YEARS
    : dobPicker === 'month' ? MONTHS.map((_, i) => String(i + 1).padStart(2, '0'))
    : dobPicker === 'day'
      ? Array.from({ length: dobYear && dobMonth ? daysInMonth(dobYear, Number(dobMonth) - 1) : 31 }, (_, i) => String(i + 1).padStart(2, '0'))
      : [];

  return (
    <View style={s.bg}>
      {/* Fixed header bar — below the notch, above everything else */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={s.headerBack}
          onPress={() => (step > 1 ? setStep(step - 1) : navigation.navigate('Auth'))}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {step === 1 ? t.stepAccount : step === 2 ? t.stepDetails : t.stepPhotos}
        </Text>
        <View style={s.headerBack} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <StepIndicator step={step} />

          {step === 1 && (
            <>
              <Text style={s.sectionLabel}>{t.language}</Text>
              <View style={{ marginBottom: 24 }}>
                <TouchableOpacity style={[s.langBox, langOpen && { borderColor: C.accent }]} onPress={() => setLangOpen((o) => !o)} activeOpacity={0.8}>
                  <Text style={s.langFlag}>{LANGUAGES.find((l) => l.code === lang)?.flag ?? '🌐'}</Text>
                  <Text style={s.langLabel}>{LANGUAGES.find((l) => l.code === lang)?.label ?? lang}</Text>
                  <Text style={{ color: C.textDim, fontSize: 11 }}>{langOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {langOpen && (
                  <View style={s.langList}>
                    {LANGUAGES.map(({ code, flag, label }) => {
                      const active = lang === code;
                      return (
                        <TouchableOpacity
                          key={code}
                          style={[s.langItem, active && { backgroundColor: C.accent + '14' }]}
                          onPress={() => { setLang(code); setLangOpen(false); }}
                          activeOpacity={0.7}
                        >
                          <Text style={s.langFlag}>{flag}</Text>
                          <Text style={[s.langItemLabel, { color: active ? C.accent : C.text }, active && { fontWeight: '700' }]}>{label}</Text>
                          {active && <Text style={{ color: C.accent, fontSize: 16 }}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {!!error && <Text style={s.error}>{error}</Text>}

              <Field label={t.usernameReq} value={username} onChangeText={setUsername} />
              <Field label={t.emailReq} value={email} onChangeText={setEmail} keyboardType="email-address" />

              <TouchableOpacity style={s.pinRow} onPress={openPinEntry}>
                <Text style={s.pinLabel}>{t.pinCodeReq}</Text>
                <Text style={[s.pinAction, pinSet && s.pinDone]}>{pinSet ? `${t.pinCreated} ✓` : `${t.createPin} ›`}</Text>
              </TouchableOpacity>

              <View style={{ height: 16 }} />

              <TouchableOpacity style={s.checkRow} onPress={() => setTncAccepted(!tncAccepted)} activeOpacity={0.7}>
                <View style={[s.checkbox, tncAccepted && s.checkboxOn]}>{tncAccepted && <Text style={s.checkMark}>✓</Text>}</View>
                <Text style={s.checkText}>
                  {t.acceptTermsPre}{' '}
                  <Text style={s.checkLink} onPress={() => navigation.navigate('Terms')}>{t.termsAndConditions}</Text>
                  {' '}{t.acceptTermsPost}
                </Text>
              </TouchableOpacity>

              <View style={{ height: 12 }} />

              <TouchableOpacity style={s.checkRow} onPress={() => setInfoAccepted(!infoAccepted)} activeOpacity={0.7}>
                <View style={[s.checkbox, infoAccepted && s.checkboxOn]}>{infoAccepted && <Text style={s.checkMark}>✓</Text>}</View>
                <Text style={s.checkText}>{t.consentText}</Text>
              </TouchableOpacity>

              <View style={{ height: 28 }} />

              <TouchableOpacity style={[s.btn, !canStep1 && s.btnDisabled]} onPress={canStep1 ? advanceToStep2 : undefined} activeOpacity={canStep1 ? 0.85 : 1}>
                <Text style={s.btnText}>{t.continue.toUpperCase()} →</Text>
              </TouchableOpacity>

              <View style={{ height: 24 }} />
              <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
                <Text style={s.alreadyText}>{t.alreadyAccount}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Image
                source={require('../../assets/images/signup_hero.png')} /* ⚠️ set to your saved path */
                style={s.heroImage}
                resizeMode="cover"
              />
              <Text style={s.sectionLabel}>{t.gender}</Text>
              <View style={s.genderRow}>
                {[
                  { key: 'female', label: t.female, icon: 'female' },
                  { key: 'male', label: t.male, icon: 'male' },
                  { key: 'undefined', label: t.genderUndefined, icon: 'unknown' },
                ].map(({ key, label, icon }) => {
                  const active = gender === key;
                  return (
                    <TouchableOpacity key={key} style={s.genderItem} onPress={() => setGender(key)} activeOpacity={0.7}>
                      <View style={[s.genderCircle, { backgroundColor: active ? C.accent : C.surfaceAlt }]}>
                        <GenderIcon type={icon} active={active} color={active ? '#fff' : C.accent} size={44} />
                      </View>
                      <Text style={[s.genderText, active && { color: C.accent, fontWeight: '700' }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.sectionLabel}>{t.dob}</Text>
              <View style={s.dobRow}>
                <TouchableOpacity style={s.dobBox} onPress={() => setDobPicker('day')} activeOpacity={0.8}>
                  <Text style={[s.dobValue, { color: dobDay ? C.text : C.textDim }]}>{dobDay ? String(Number(dobDay)) : t.day}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.dobBox, { flex: 1.4 }]} onPress={() => setDobPicker('month')} activeOpacity={0.8}>
                  <Text style={[s.dobValue, { color: dobMonth ? C.text : C.textDim }]}>{dobMonth ? MONTHS[Number(dobMonth) - 1] : t.month}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.dobBox, { flex: 1.3 }]} onPress={() => setDobPicker('year')} activeOpacity={0.8}>
                  <Text style={[s.dobValue, { color: dobYear ? C.text : C.textDim }]}>{dobYear || t.year}</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.dobPreview}>{dobLabel}</Text>

              {!!error && <Text style={s.error}>{error}</Text>}

              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={!loading ? submitStep2 : undefined} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t.continue.toUpperCase()} →</Text>}
              </TouchableOpacity>

            </>
          )}

          {step === 3 && (
            <>
              <Text style={s.sectionLabel}>{t.photosOptional}</Text>
              <View style={s.photoGrid}>
                {photos.map((uri, i) => (
                  <View key={`${uri}-${i}`} style={s.photoCell}>
                    <Image source={{ uri }} style={s.photoImg} />
                    <TouchableOpacity style={s.photoRemove} onPress={() => removePhoto(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.photoRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={s.photoAdd} onPress={addPhoto} activeOpacity={0.8}>
                  <Text style={s.photoAddPlus}>＋</Text>
                </TouchableOpacity>
              </View>

              <Text style={[s.sectionLabel, { marginTop: 24 }]}>{t.bioOptional}</Text>
              <TextInput
                style={s.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder={t.bioPlaceholder}
                placeholderTextColor={C.textDim}
                multiline
                maxLength={500}
                textAlignVertical="top"
                selectionColor={C.accent}
              />

              {!!error && <Text style={s.error}>{error}</Text>}

              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={!loading ? finishStep3 : undefined} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t.finish.toUpperCase()}</Text>}
              </TouchableOpacity>

              <View style={{ height: 16 }} />
              <TouchableOpacity onPress={!loading ? skipStep3 : undefined}>
                <Text style={s.alreadyText}>{t.skipForNow}</Text>
              </TouchableOpacity>

            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!dobPicker} transparent animationType="fade" onRequestClose={() => setDobPicker(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setDobPicker(null)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>
              {dobPicker === 'year' ? t.year : dobPicker === 'month' ? t.month : t.day}
            </Text>
            <FlatList
              data={dobOptions}
              keyExtractor={(item) => item}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.modalItem}
                  onPress={() => {
                    if (dobPicker === 'year') setDobYear(item);
                    else if (dobPicker === 'month') setDobMonth(item);
                    else setDobDay(item);
                    setDobPicker(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: '500' }}>
                    {dobPicker === 'month' ? MONTHS[Number(item) - 1] : dobPicker === 'day' ? String(Number(item)) : item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 20, paddingBottom: 50 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: C.accent,
  },
  headerBack: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  backArrow: { color: '#fff', fontSize: 34, lineHeight: 36 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 40, height: 2, marginHorizontal: 6 },
  sectionLabel: { color: C.textDim, fontSize: 16, fontWeight: '700', marginBottom: 14, marginTop: 6, letterSpacing: 0.3 },
  heroImage: { width: '100%', height: 180, borderRadius: 16, marginBottom: 24 },
  error: { color: C.danger, fontSize: 14, marginBottom: 14 },
  fieldLabel: { color: C.textDim, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  fieldInput: { color: C.text, fontSize: 16, fontWeight: '500', paddingBottom: 8 },
  fieldLine: { height: 2, backgroundColor: C.border, width: '100%' },
  langBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, backgroundColor: C.surface, gap: 10 },
  langFlag: { fontSize: 20 },
  langLabel: { flex: 1, color: C.text, fontSize: 16, fontWeight: '600' },
  langList: { borderWidth: 1.5, borderColor: C.border, borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden', marginTop: -2, backgroundColor: C.surface },
  langItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  langItemLabel: { flex: 1, fontSize: 16 },
  pinRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: C.border },
  pinSheet: { width: '100%', borderRadius: 18, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, padding: 24 },
  pinSheetTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 18, textAlign: 'center' },
  pinInput: { color: C.text, fontSize: 30, letterSpacing: 12, textAlign: 'center', borderBottomWidth: 1.5, borderBottomColor: C.border, paddingVertical: 10, marginBottom: 18 },
  pinFieldLabel: { color: C.textDim, fontSize: 14, fontWeight: '600', marginBottom: 2, textAlign: 'center' },
  pinErrorText: { color: C.danger, fontSize: 14, textAlign: 'center', marginBottom: 8 },
  pinBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20 },
  pinCancel: { color: C.textDim, fontSize: 16, fontWeight: '700' },
  pinSave: { backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  pinSaveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pinLabel: { color: C.textDim, fontSize: 16, fontWeight: '600' },
  pinAction: { color: C.accent, fontSize: 16, fontWeight: '700' },
  pinDone: { color: C.success },
  checkRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: C.accent, justifyContent: 'center', alignItems: 'center', marginTop: 2, flexShrink: 0 },
  checkboxOn: { backgroundColor: C.accent, borderColor: C.accent },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 16 },
  checkText: { color: C.text, fontSize: 14, lineHeight: 20, flex: 1 },
  checkLink: { color: C.accent, fontWeight: '700', textDecorationLine: 'underline' },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  genderItem: { alignItems: 'center', flex: 1 },
  genderCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  genderText: { fontSize: 14, color: C.textDim, fontWeight: '500' },
  dobRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dobBox: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center' },
  dobValue: { fontSize: 16, fontWeight: '600' },
  dobPreview: { color: C.textDim, fontSize: 13, marginBottom: 22, textAlign: 'center' },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  metricLabel: { color: C.textDim, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCell: { width: 100, height: 100, borderRadius: 12, position: 'relative' },
  photoImg: { width: 100, height: 100, borderRadius: 12, backgroundColor: C.surfaceAlt },
  photoRemove: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' },
  photoRemoveText: { color: '#fff', fontSize: 16, fontWeight: '800', lineHeight: 18 },
  photoAdd: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  photoAddPlus: { color: C.accent, fontSize: 34, fontWeight: '300' },
  bioInput: { minHeight: 110, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, backgroundColor: C.surface, color: C.text, fontSize: 16, padding: 14, marginBottom: 8 },
  dropTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, borderWidth: 1.5, borderColor: C.border, borderRadius: 8, backgroundColor: C.surface },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalSheet: { width: '100%', borderRadius: 18, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, overflow: 'hidden' },
  modalTitle: { color: C.text, fontSize: 16, fontWeight: '700', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, height: 44 },
  btn: { width: '100%', height: 56, backgroundColor: C.accent, borderRadius: 10, justifyContent: 'center', alignItems: 'center', shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  alreadyText: { color: C.textDim, fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
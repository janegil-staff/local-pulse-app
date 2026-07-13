// localpulse/app/src/screens/auth/PinSetupScreen.js
import React from 'react';
import PinInputScreen from './PinInputScreen.js';
import { useLang } from '../../context/LangContext.js';

export default function PinSetupScreen({ navigation, route }) {
  const { t } = useLang();
  const returnParams = route?.params?.returnParams ?? {};
  const returnTo = route?.params?.returnTo ?? 'Register';
  const onEnterPin = (pin) => {
    navigation.navigate('PinConfirm', { firstPin: pin, returnParams, returnTo });
  };
  return (
    <PinInputScreen
      title={t.createPin || 'Choose a PIN'}
      subtitle={t.pinSetupSubtitle || 'Enter a 4-digit PIN to secure your app'}
      onComplete={onEnterPin}
      onBack={() => navigation.goBack()}
    />
  );
}
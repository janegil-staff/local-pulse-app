// localpulse/app/src/screens/auth/PinConfirmScreen.js
import React from 'react';
import { Alert } from 'react-native';
import PinInputScreen from './PinInputScreen.js';
import { useLang } from '../../context/LangContext.js';

export default function PinConfirmScreen({ navigation, route }) {
  const { t } = useLang();
  const { firstPin, returnParams = {}, returnTo = 'Register' } = route.params ?? {};
  const onConfirm = (pin) => {
    if (pin !== firstPin) {
      Alert.alert(
        t.pinMismatch || 'PINs do not match',
        t.pinTryAgain || 'Please try again.',
        [{ text: t.ok || 'OK', onPress: () => navigation.goBack() }],
      );
      return;
    }
    navigation.navigate(returnTo, { ...returnParams, pin });
  };
  return (
    <PinInputScreen
      title={t.confirmPin || 'Confirm PIN'}
      subtitle={t.pinConfirmSubtitle || 'Enter your PIN again to confirm'}
      onComplete={onConfirm}
      onBack={() => navigation.goBack()}
    />
  );
}
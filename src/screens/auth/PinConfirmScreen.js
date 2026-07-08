// localpulse/app/src/screens/auth/PinConfirmScreen.js
import React from 'react';
import { Alert } from 'react-native';
import PinInputScreen from './PinInputScreen.js';

export default function PinConfirmScreen({ navigation, route }) {
  const { firstPin, returnParams = {}, returnTo = 'Register' } = route.params ?? {};

  const onConfirm = (pin) => {
    if (pin !== firstPin) {
      Alert.alert('PINs do not match', 'Please try again.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    navigation.navigate(returnTo, { ...returnParams, pin });
  };

  return (
    <PinInputScreen
      title="Confirm PIN"
      subtitle="Enter your PIN again to confirm"
      onComplete={onConfirm}
      onBack={() => navigation.goBack()}
    />
  );
}

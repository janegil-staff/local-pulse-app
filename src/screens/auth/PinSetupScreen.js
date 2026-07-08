// localpulse/app/src/screens/auth/PinSetupScreen.js
import React from 'react';
import PinInputScreen from './PinInputScreen.js';

export default function PinSetupScreen({ navigation, route }) {
  const returnParams = route?.params?.returnParams ?? {};
  const returnTo = route?.params?.returnTo ?? 'Register';

  const onEnterPin = (pin) => {
    navigation.navigate('PinConfirm', { firstPin: pin, returnParams, returnTo });
  };

  return (
    <PinInputScreen
      title="Choose a PIN"
      subtitle="Enter a 4-digit PIN to secure your app"
      onComplete={onEnterPin}
      onBack={() => navigation.goBack()}
    />
  );
}

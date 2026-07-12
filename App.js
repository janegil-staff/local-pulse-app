// localpulse/app/App.js
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator.js';
import { AuthProvider, useAuth } from './src/context/AuthContext.js';
import { ThemeProvider, useThemeMode } from './src/theme/ThemeContext.js';
import { theme } from './src/theme/theme.js';
import { LangProvider } from './src/context/LangContext.js';
import Toast from 'react-native-toast-message';

function AppInner() {
  const { hydrated } = useAuth();
  const { mode } = useThemeMode();

  const navTheme = {
    ...(mode === 'light' ? DefaultTheme : DarkTheme),
    colors: {
      ...(mode === 'light' ? DefaultTheme.colors : DarkTheme.colors),
      background: theme.colors.bg,
      card: theme.colors.bg,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.accent,
    },
  };

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
          <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
        </NavigationContainer>
        {/* Toast host: outside NavigationContainer so it floats above every
            screen, inside SafeAreaProvider so it respects the notch/home bar. */}
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <LangProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ThemeProvider>
    </LangProvider>
  );
}
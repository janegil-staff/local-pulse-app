// localpulse/app/src/navigation/RootNavigator.js
import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { useChatStore } from '../store/chatStore.js';
import AuthScreen from '../screens/AuthScreen.js';
import OnboardingScreen from '../screens/OnboardingScreen.js';
import DiscoveryScreen from '../screens/DiscoveryScreen.js';
import FeedScreen from '../screens/FeedScreen.js';
import MatchesScreen from '../screens/MatchesScreen.js';
import ConversationsScreen from '../screens/ConversationsScreen.js';
import ChatScreen from '../screens/ChatScreen.js';
import SettingsScreen from '../screens/SettingsScreen.js';
import ComposeScreen from '../screens/ComposeScreen.js';
import PostDetailScreen from '../screens/PostDetailScreen.js';
import ProfileScreen from '../screens/ProfileScreen.js';
import SavedScreen from '../screens/SavedScreen.js';
import LegalScreen from '../screens/LegalScreen.js';
import PinSetupScreen from '../screens/auth/PinSetupScreen.js';
import PinConfirmScreen from '../screens/auth/PinConfirmScreen.js';
import { registerForPush } from '../lib/push.js';
import { theme } from '../theme/theme.js';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: theme.colors.bg },
  headerTintColor: theme.colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: theme.colors.bg },
};

function tabIcon(glyph) {
  return ({ color }) => <Text style={{ color, fontSize: 20 }}>{glyph}</Text>;
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textDim,
      }}
    >
      <Tab.Screen name="Discover" component={DiscoveryScreen} options={{ headerShown: false, tabBarIcon: tabIcon('🔥') }} />
      <Tab.Screen name="Feed" component={FeedScreen} options={{ headerShown: false, tabBarIcon: tabIcon('⌂') }} />
      <Tab.Screen name="Matches" component={MatchesScreen} options={{ tabBarIcon: tabIcon('♥') }} />
      <Tab.Screen name="Messages" component={ConversationsScreen} options={{ tabBarIcon: tabIcon('✉') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: tabIcon('⚙') }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { token, user } = useAuth();
  const initSocket = useChatStore((s) => s.initSocket);

  const loggedIn = Boolean(token);
  const needsOnboarding = loggedIn && user && !user.profileComplete;

  useEffect(() => {
    if (loggedIn) {
      initSocket();
      registerForPush().catch(() => {});
    }
  }, [loggedIn, initSocket]);

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!loggedIn ? (
        <>
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={AuthScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PinSetup" component={PinSetupScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PinConfirm" component={PinConfirmScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Terms" component={LegalScreen} initialParams={{ doc: 'terms' }} options={{ title: 'Terms of Service' }} />
          <Stack.Screen name="Privacy" component={LegalScreen} initialParams={{ doc: 'privacy' }} options={{ title: 'Privacy Policy' }} />
        </>
      ) : needsOnboarding ? (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Terms" component={LegalScreen} initialParams={{ doc: 'terms' }} options={{ title: 'Terms of Service' }} />
          <Stack.Screen name="Privacy" component={LegalScreen} initialParams={{ doc: 'privacy' }} options={{ title: 'Privacy Policy' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params?.title || 'Chat' })} />
          {/* Feed-side stack screens */}
          <Stack.Screen name="Compose" component={ComposeScreen} options={{ title: 'New Post', presentation: 'modal' }} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Post' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="Saved" component={SavedScreen} options={{ title: 'Saved' }} />
          <Stack.Screen name="Terms" component={LegalScreen} initialParams={{ doc: 'terms' }} options={{ title: 'Terms of Service' }} />
          <Stack.Screen name="Privacy" component={LegalScreen} initialParams={{ doc: 'privacy' }} options={{ title: 'Privacy Policy' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

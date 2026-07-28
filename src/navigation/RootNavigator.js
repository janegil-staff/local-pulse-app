// localpulse/app/src/navigation/RootNavigator.js
import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext.js";
import { useChatStore } from "../store/chatStore.js";
import AuthScreen from "../screens/AuthScreen.js";
import OnboardingScreen from "../screens/OnboardingScreen.js";
import DiscoveryScreen from "../screens/DiscoveryScreen.js";
import FeedScreen from "../screens/FeedScreen.js";
import ConversationsScreen from "../screens/ConversationsScreen.js";
import ChatScreen from "../screens/ChatScreen.js";
import SettingsScreen from "../screens/SettingsScreen.js";
import ComposeScreen from "../screens/ComposeScreen.js";
import PostDetailScreen from "../screens/PostDetailScreen.js";
import ProfileScreen from "../screens/ProfileScreen.js";
import SavedScreen from "../screens/SavedScreen.js";
import LegalScreen from "../screens/LegalScreen.js";
import PinSetupScreen from "../screens/auth/PinSetupScreen.js";
import PinConfirmScreen from "../screens/auth/PinConfirmScreen.js";
import MyProfileScreen from "../screens/MyProfileScreen.js";
import ChangeEmailScreen from "../screens/ChangeEmailScreen.js";
import LocationPickerScreen from "../screens/LocationPickerScreen.js";
import { registerForPush } from "../lib/push.js";
import { useStyles } from "../theme/theme.js";
import PersonalSettingsScreen from "../screens/PersonalSettingsScreen.js";
import ForgotPinScreen from "../screens/ForgotPinScreen.js";
import ChangePinScreen from "../screens/ChangePinScreen.js";
import BlockedUsersScreen from "../screens/BlockedUsersScreen.js";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navigationStylesFactory = ({ colors }) => ({
  stackScreenOptions: {
    headerStyle: {
      backgroundColor: colors.surface,
    },
    headerTintColor: colors.text,
    headerTitleStyle: {
      color: colors.text,
      fontWeight: "700",
    },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
    contentStyle: {
      backgroundColor: colors.bg,
    },
  },

  tabScreenOptions: {
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
    },
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.textDim,
    tabBarLabelStyle: {
      fontWeight: "600",
    },
  },

  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});

function tabIcon(glyph) {
  return ({ color }) => <Text style={{ color, fontSize: 20 }}>{glyph}</Text>;
}

// Shown only while a stored token is exchanged for a profile at launch.
// Every other path must fall through to a real screen — a splash reachable
// any other way is indistinguishable from a hang.
function BootSplash() {
  const navStyles = useStyles(navigationStylesFactory);
  return (
    <View style={navStyles.boot}>
      <ActivityIndicator />
    </View>
  );
}

function Tabs() {
  const navStyles = useStyles(navigationStylesFactory);

  return (
    <Tab.Navigator
      screenOptions={{
        ...navStyles.stackScreenOptions,
        ...navStyles.tabScreenOptions,
      }}
    >
      {/* Messages lives in the header (✉), not the tab bar. */}
      <Tab.Screen
        name="Discover"
        component={DiscoveryScreen}
        options={{
          headerShown: false,
          tabBarIcon: tabIcon("◎"),
        }}
      />

      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          headerShown: false,
          tabBarIcon: tabIcon("⌂"),
        }}
      />

      <Tab.Screen
        name="MyProfile"
        component={MyProfileScreen}
        options={{
          headerShown: false,
          title: "Profile",
          tabBarIcon: tabIcon("☺"),
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const navStyles = useStyles(navigationStylesFactory);
  const { token, user, loading, isNewUser } = useAuth();
  const initSocket = useChatStore((s) => s.initSocket);

  const loggedIn = Boolean(token);

  useEffect(() => {
    if (loggedIn) {
      initSocket();
      registerForPush().catch(() => {});
    }
  }, [loggedIn, initSocket]);

  // ---- routing --------------------------------------------------------
  //
  // TWO branches only, and the boundary is deliberately NOT `loggedIn`.
  //
  // Signup is a multi-step flow that calls register() partway through — so
  // the token appears mid-flow. If `loggedIn` chose the branch, that call
  // would change the navigator's children while the user is standing on
  // step 2, React Navigation would rebuild the navigator, and the screen
  // would remount at step 1. The user fills it in again, register fires
  // again, and round it goes: from their side, signup is simply stuck.
  //
  // So: signed-out and first-run share ONE branch. Registering does not
  // alter the children at all, and nothing remounts. The switch to the app
  // happens exactly once, when onboarding sets isNewUser false — which is
  // the one moment a remount is what you actually want.
  //
  // profileComplete is not consulted anywhere. It used to gate onboarding,
  // which meant anyone who skipped a step could never reach the app again.
  // Completeness is advisory now: <ProfilePrompt /> inside the app says
  // what is missing and links to the screen that fixes it.
  console.log("NAV", {
    loggedIn,
    isNewUser,
    hasUser: !!user,
    loading,
    inSignupFlow,
  });
  if (loading) {
    return <BootSplash />;
  }

  const inSignupFlow = !loggedIn || isNewUser;

  // Token restored at launch but the profile has not arrived yet. Only
  // reachable outside the signup flow, so it cannot trap a new account.
  if (!inSignupFlow && !user) {
    return <BootSplash />;
  }

  return (
    <Stack.Navigator screenOptions={navStyles.stackScreenOptions}>
      {inSignupFlow ? (
        <>
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PinSetup"
            component={PinSetupScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PinConfirm"
            component={PinConfirmScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ForgotPin"
            component={ForgotPinScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LocationPicker"
            component={LocationPickerScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Terms"
            component={LegalScreen}
            initialParams={{ doc: "terms" }}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Privacy"
            component={LegalScreen}
            initialParams={{ doc: "privacy" }}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Tabs"
            component={Tabs}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="BlockedUsers"
            component={BlockedUsersScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Messages"
            component={ConversationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PersonalSettings"
            component={PersonalSettingsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChangeEmail"
            component={ChangeEmailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChangePin"
            component={ChangePinScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LocationPicker"
            component={LocationPickerScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Compose"
            component={ComposeScreen}
            options={{ headerShown: false, presentation: "modal" }}
          />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{ title: "Post" }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Saved"
            component={SavedScreen}
            options={{ title: "Saved" }}
          />
          <Stack.Screen
            name="Terms"
            component={LegalScreen}
            initialParams={{ doc: "terms" }}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Privacy"
            component={LegalScreen}
            initialParams={{ doc: "privacy" }}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

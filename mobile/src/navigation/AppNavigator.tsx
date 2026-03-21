import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import VerifyEmailScreen from "../screens/VerifyEmailScreen";
import ProfileSetupScreen from "../screens/ProfileSetupScreen";
import HomeScreen from "../screens/HomeScreen";
import DateRequestScreen from "../screens/DateRequestScreen";
import GroupRevealScreen from "../screens/GroupRevealScreen";
import ChatScreen from "../screens/ChatScreen";
import ChatRoomsScreen from "../screens/ChatRoomsScreen";
import PostDateScreen from "../screens/PostDateScreen";
import MatchRevealScreen from "../screens/MatchRevealScreen";
import { getMyProfile } from "../api/profiles";
import { Match } from "../types";

export type AuthStackParamList = {
  Login: { message?: string } | undefined;
  Register: undefined;
  VerifyEmail: { email: string; otp?: string };
};

export type HomeStackParamList = {
  HomeMain: undefined;
  DateRequest: undefined;
  GroupReveal: { groupId: string };
  ChatDetail: { roomId: string };
  PostDate: { groupId: string };
  MatchReveal: { match: Match };
};

export type ChatStackParamList = {
  ChatRooms: undefined;
  ChatDetail: { roomId: string };
};

export type MainTabParamList = {
  Home: undefined;
  MyDates: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  ProfileSetup: undefined;
  MainTabs: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{title}</Text>
      <Text style={styles.placeholderSub}>Coming soon</Text>
    </View>
  );
}

function MyDatesScreen() {
  return <PlaceholderScreen title="My Dates" />;
}

function ProfileScreen() {
  return <PlaceholderScreen title="Profile" />;
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </AuthStack.Navigator>
  );
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#E91E63" },
        headerTintColor: "#fff",
      }}
    >
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: "LoveGenie" }}
      />
      <HomeStack.Screen
        name="DateRequest"
        component={DateRequestScreen}
        options={{ title: "New Date Request" }}
      />
      <HomeStack.Screen
        name="GroupReveal"
        component={GroupRevealScreen}
        options={{ title: "Your Group" }}
      />
      <HomeStack.Screen
        name="ChatDetail"
        component={ChatScreen}
        options={{ title: "Chat" }}
      />
      <HomeStack.Screen
        name="PostDate"
        component={PostDateScreen}
        options={{ title: "Post-Date Feedback" }}
      />
      <HomeStack.Screen
        name="MatchReveal"
        component={MatchRevealScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#E91E63" },
        headerTintColor: "#fff",
      }}
    >
      <ChatStack.Screen
        name="ChatRooms"
        component={ChatRoomsScreen}
        options={{ title: "Chat" }}
      />
      <ChatStack.Screen
        name="ChatDetail"
        component={ChatScreen}
        options={{ title: "Chat" }}
      />
    </ChatStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#E91E63",
      }}
    >
      <MainTab.Screen name="Home" component={HomeStackNavigator} />
      <MainTab.Screen
        name="MyDates"
        component={MyDatesScreen}
        options={{
          title: "My Dates",
          headerShown: true,
          headerStyle: { backgroundColor: "#E91E63" },
          headerTintColor: "#fff",
        }}
      />
      <MainTab.Screen
        name="Chat"
        component={ChatStackNavigator}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: "#E91E63" },
          headerTintColor: "#fff",
        }}
      />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    if (user && !profileChecked) {
      setCheckingProfile(true);
      getMyProfile()
        .then(profile => {
          setHasProfile(!!profile.bio);
        })
        .catch(() => {
          setHasProfile(false);
        })
        .finally(() => {
          setProfileChecked(true);
          setCheckingProfile(false);
        });
    }
    if (!user) {
      setProfileChecked(false);
      setHasProfile(false);
    }
  }, [user]);

  if (isLoading || (user && checkingProfile)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  if (!hasProfile) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <RootStack.Screen name="MainTabs" component={MainNavigator} />
      </RootStack.Navigator>
    );
  }

  return <MainNavigator />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#E91E63",
    marginBottom: 8,
  },
  placeholderSub: {
    fontSize: 16,
    color: "#999",
  },
});

import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, BackHandler } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
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
import SoftMatchScreen from "../screens/SoftMatchScreen";
import MyDatesScreen from "../screens/MyDatesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import FriendsScreen from "../screens/FriendsScreen";
import { getMyProfile } from "../api/profiles";
import { Match, SoftMatch } from "../types";
import useNotifications from "../hooks/useNotifications";
import useUnreadCount from "../hooks/useUnreadCount";
import { LoadingState } from "../components";
import { colors } from "../theme";

export type AuthStackParamList = {
  Login: { message?: string } | undefined;
  Register: undefined;
  VerifyEmail: { email: string; otp?: string; password?: string };
};

export type HomeStackParamList = {
  HomeMain: undefined;
  DateRequest: undefined;
  GroupReveal: { groupId: string };
  ChatDetail: { roomId: string };
  PostDate: { groupId: string };
  MatchReveal: { match: Match };
  SoftMatch: { softMatch: SoftMatch };
};

export type ChatStackParamList = {
  ChatRooms: undefined;
  ChatDetail: { roomId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Friends: undefined;
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
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const headerOptions = {
  headerStyle: { backgroundColor: colors.surfaceElevated },
  headerTintColor: colors.dark,
  headerTitleStyle: { color: colors.dark, fontWeight: '600' as const },
  headerShadowVisible: false,
};

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
    <HomeStack.Navigator screenOptions={headerOptions}>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: "Yuni" }}
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
      <HomeStack.Screen
        name="SoftMatch"
        component={SoftMatchScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator screenOptions={headerOptions}>
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

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={headerOptions}>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
      <ProfileStack.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ title: "Friends" }}
      />
    </ProfileStack.Navigator>
  );
}

function MainNavigator() {
  useNotifications();
  const unreadCount = useUnreadCount();

  // Android back handler: prevent exiting app from tab screens
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Return false to let default behavior (navigate back in stack)
      // Only prevent exit if we're at the root of a tab
      return false;
    });
    return () => handler.remove();
  }, []);

  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.borderLight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <MainTab.Screen
        name="MyDates"
        component={MyDatesScreen}
        options={{
          title: "My Dates",
          tabBarLabel: 'My Dates',
          headerShown: true,
          ...headerOptions,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <MainTab.Screen
        name="Chat"
        component={ChatStackNavigator}
        options={{
          tabBarLabel: 'Chat',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, fontSize: 10 },
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "chatbubble" : "chatbubble-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
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
          setHasProfile(!!profile.bio || (profile.interests && profile.interests.length > 0));
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
    return <LoadingState message="Loading..." />;
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

import React from "react";
import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import VerifyEmailScreen from "../screens/VerifyEmailScreen";

export type AuthStackParamList = {
  Login: { message?: string } | undefined;
  Register: undefined;
  VerifyEmail: { email: string; otp?: string };
};

export type MainTabParamList = {
  Home: undefined;
  MyDates: undefined;
  Chat: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{title}</Text>
      <Text style={styles.placeholderSub}>Coming soon</Text>
    </View>
  );
}

function HomeScreen() {
  return <PlaceholderScreen title="Home" />;
}

function MyDatesScreen() {
  return <PlaceholderScreen title="My Dates" />;
}

function ChatScreen() {
  return <PlaceholderScreen title="Chat" />;
}

function ProfileScreen() {
  return <PlaceholderScreen title="Profile" />;
}

function ProfileSetupPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Profile Setup</Text>
      <Text style={styles.placeholderSub}>Coming in Phase 14</Text>
    </View>
  );
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

function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#E91E63" },
        headerTintColor: "#fff",
        tabBarActiveTintColor: "#E91E63",
      }}
    >
      <MainTab.Screen name="Home" component={HomeScreen} />
      <MainTab.Screen
        name="MyDates"
        component={MyDatesScreen}
        options={{ title: "My Dates" }}
      />
      <MainTab.Screen name="Chat" component={ChatScreen} />
      <MainTab.Screen name="Profile" component={ProfileScreen} />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  // Check if user has completed profile setup (has program/bio)
  // For now, go straight to main tabs — profile setup will be Phase 14
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

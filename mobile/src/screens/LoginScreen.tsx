import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { AuthStackParamList } from "../navigation/AppNavigator";
import { colors, typography, spacing, radii } from '../theme';
import { AnimatedButton } from '../components';
import { haptic } from '../utils/haptics';


type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation, route }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const successMessage = route.params?.message;

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      let message = error.response?.data?.detail;
      if (!message) {
        if (error.code === "ERR_NETWORK" || error.message?.includes("Network")) {
          message = `Cannot reach the server. Make sure the backend is running. (${error.message})`;
        } else {
          message = `Unexpected error: ${error.message || String(error)}`;
        }
      }
      haptic.error();
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>LoveGenie</Text>
        <Text style={styles.subtitle}>Group dating for university students</Text>

        {successMessage && (
          <Text style={styles.successMessage}>{successMessage}</Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          testID="email-input"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="password-input"
        />

        <AnimatedButton
          label="Log In"
          onPress={handleLogin}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          testID="register-link"
        >
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.link}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xxxl,
  },
  title: {
    ...typography.displayLarge,
    textAlign: "center",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    textAlign: "center",
    color: colors.darkSecondary,
    marginBottom: spacing.xxxxl,
  },
  successMessage: {
    ...typography.bodySmall,
    color: colors.success,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.md + 2,
    fontSize: 16,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceElevated,
  },
  linkText: {
    textAlign: "center",
    color: colors.darkSecondary,
    fontSize: 14,
    marginTop: spacing.xl,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
  },
});

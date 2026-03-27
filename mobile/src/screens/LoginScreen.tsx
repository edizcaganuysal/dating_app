import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated from "react-native-reanimated";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { AuthStackParamList } from "../navigation/AppNavigator";
import { colors, typography, fontFamilies, spacing, radii } from '../theme';
import { AnimatedButton, Logo, ParticleEffect, WarmInput } from '../components';
import { haptic } from '../utils/haptics';
import { useFadeIn } from '../utils/animations';

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation, route }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const successMessage = route.params?.message;

  const logoFade = useFadeIn({ delay: 100, direction: 'none' });
  const subtitleFade = useFadeIn({ delay: 250 });
  const emailFade = useFadeIn({ delay: 350 });
  const passwordFade = useFadeIn({ delay: 450 });
  const buttonFade = useFadeIn({ delay: 550 });

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
        if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
          message = "Request timed out. Check your internet connection.";
        } else if (error.code === "ERR_NETWORK" || error.message?.includes("Network")) {
          message = "Cannot reach the server. Check your connection.";
        } else {
          message = `Login failed: ${error.message || String(error)}`;
        }
      }
      haptic.error();
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.rootBg}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Subtle background particles */}
      <ParticleEffect count={6} intensity="subtle" />

      <View style={styles.inner}>
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, logoFade]}>
          <Logo size="lg" />
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={subtitleFade}>
          <Text style={styles.subtitle}>
            The group dating app{'\n'}for university students
          </Text>
        </Animated.View>

        {successMessage && (
          <Text style={styles.successMessage}>{successMessage}</Text>
        )}

        {/* Email input */}
        <Animated.View style={emailFade}>
          <WarmInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="mail-outline"
            testID="email-input"
          />
        </Animated.View>

        {/* Password input */}
        <Animated.View style={passwordFade}>
          <WarmInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon="lock-closed-outline"
            testID="password-input"
          />
        </Animated.View>

        {/* Login button */}
        <Animated.View style={buttonFade}>
          <AnimatedButton
            label="Log In"
            onPress={handleLogin}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          />
        </Animated.View>

        {/* Register link */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  rootBg: { flex: 1, backgroundColor: colors.cream },
  container: { flex: 1, backgroundColor: colors.cream },
  inner: {
    flex: 1, justifyContent: "center",
    paddingHorizontal: spacing.xxxl,
    zIndex: 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontFamily: fontFamilies.playfair.italic,
    fontSize: 18, lineHeight: 26,
    textAlign: "center",
    color: colors.darkSecondary,
    marginBottom: spacing.xxxxl,
    opacity: 0.7,
  },
  successMessage: {
    ...typography.bodySmall,
    color: colors.success,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  linkText: {
    textAlign: "center",
    color: colors.darkSecondary,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    marginTop: spacing.xl,
  },
  link: {
    color: colors.primary,
    fontFamily: fontFamilies.inter.semiBold,
  },
});

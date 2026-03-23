import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { AuthStackParamList } from "../navigation/AppNavigator";
import { colors, typography, spacing, radii } from "../theme";
import { AnimatedButton } from "../components";
import { haptic } from "../utils/haptics";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyEmail">;

export default function VerifyEmailScreen({ navigation, route }: Props) {
  const { verifyEmail, login } = useAuth();
  const { email, otp: devOtp, password } = route.params;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN);
  const hiddenInputRef = useRef<TextInput>(null);
  const hasAutoSubmitted = useRef(false);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (otp.length === OTP_LENGTH && !hasAutoSubmitted.current && !loading) {
      hasAutoSubmitted.current = true;
      handleVerify();
    }
    // Reset auto-submit flag when OTP is incomplete
    if (otp.length < OTP_LENGTH) {
      hasAutoSubmitted.current = false;
    }
  }, [otp]);

  const handleVerify = useCallback(async () => {
    if (otp.length !== OTP_LENGTH) {
      Alert.alert("Error", "Please enter a 6-digit code");
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email, otp);
      haptic.success();
      // Auto-login after verification so user goes straight to onboarding
      if (password) {
        try {
          await login(email, password);
          // AuthContext will set user, AppNavigator will show ProfileSetup
          return;
        } catch {
          // If auto-login fails, fall back to login screen
        }
      }
      navigation.navigate("Login", {
        message: "Email verified! Please log in.",
      });
    } catch (error: any) {
      haptic.error();
      const message =
        error.response?.data?.detail || "Verification failed. Please try again.";
      Alert.alert("Verification Failed", message);
    } finally {
      setLoading(false);
    }
  }, [otp, email, password, verifyEmail, login, navigation]);

  function handleOtpChange(text: string) {
    // Only allow digits
    const digits = text.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
    setFocusedIndex(Math.min(digits.length, OTP_LENGTH - 1));
  }

  function handleKeyPress(e: { nativeEvent: { key: string } }) {
    if (e.nativeEvent.key === "Backspace" && otp.length > 0) {
      setFocusedIndex(Math.max(0, otp.length - 2));
    }
  }

  function handleBoxPress() {
    hiddenInputRef.current?.focus();
  }

  function handleResend() {
    if (resendCountdown > 0) return;
    haptic.light();
    setResendCountdown(RESEND_COOLDOWN);
    Alert.alert("Code Sent", `A new verification code has been sent to ${email}`);
  }

  function handleFocus() {
    setFocusedIndex(Math.min(otp.length, OTP_LENGTH - 1));
  }

  const isInputFocused = useRef(false);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        {/* Email icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={32} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to
        </Text>
        <Text style={styles.email}>{email}</Text>

        {devOtp && (
          <View style={styles.devBox}>
            <Text style={styles.devLabel}>Dev Mode - Your OTP:</Text>
            <Text style={styles.devOtp}>{devOtp}</Text>
          </View>
        )}

        {/* Hidden TextInput that captures all digits */}
        <TextInput
          ref={hiddenInputRef}
          style={styles.hiddenInput}
          value={otp}
          onChangeText={handleOtpChange}
          onKeyPress={handleKeyPress}
          onFocus={() => {
            isInputFocused.current = true;
            handleFocus();
          }}
          onBlur={() => {
            isInputFocused.current = false;
          }}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          autoFocus
          testID="otp-input"
          caretHidden
        />

        {/* 6 visual digit boxes */}
        <Pressable onPress={handleBoxPress} style={styles.otpContainer}>
          {Array.from({ length: OTP_LENGTH }).map((_, index) => {
            const digit = otp[index] || "";
            const isFocused = index === focusedIndex && otp.length < OTP_LENGTH;
            const isFilled = digit !== "";

            return (
              <View
                key={index}
                style={[
                  styles.otpBox,
                  isFocused && styles.otpBoxFocused,
                  isFilled && styles.otpBoxFilled,
                ]}
              >
                <Text style={[styles.otpDigit, isFilled && styles.otpDigitFilled]}>
                  {digit}
                </Text>
              </View>
            );
          })}
        </Pressable>

        {/* Verify button */}
        <View style={styles.buttonContainer}>
          <AnimatedButton
            label="Verify"
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length !== OTP_LENGTH || loading}
            fullWidth
            size="lg"
            icon="checkmark-circle-outline"
          />
        </View>

        {/* Resend code */}
        <TouchableOpacity
          onPress={handleResend}
          disabled={resendCountdown > 0}
          style={styles.resendButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="refresh-outline"
            size={16}
            color={resendCountdown > 0 ? colors.grayLight : colors.primary}
            style={styles.resendIcon}
          />
          <Text
            style={[
              styles.resendText,
              resendCountdown > 0 && styles.resendTextDisabled,
            ]}
          >
            {resendCountdown > 0
              ? `Resend in ${resendCountdown}s`
              : "Resend Code"}
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
  iconContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSelected,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.displaySmall,
    textAlign: "center",
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    textAlign: "center",
    color: colors.darkSecondary,
  },
  email: {
    ...typography.labelLarge,
    textAlign: "center",
    color: colors.primary,
    marginBottom: spacing.xxl,
  },
  devBox: {
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    alignItems: "center",
  },
  devLabel: {
    ...typography.captionSmall,
    color: "#E65100",
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  devOtp: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#E65100",
    letterSpacing: 4,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  otpBox: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surfaceSelected,
  },
  otpBoxFilled: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.surfaceElevated,
  },
  otpDigit: {
    ...typography.headlineLarge,
    color: colors.grayLight,
  },
  otpDigitFilled: {
    color: colors.dark,
  },
  buttonContainer: {
    marginBottom: spacing.xl,
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  resendIcon: {
    marginRight: spacing.xs,
  },
  resendText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  resendTextDisabled: {
    color: colors.grayLight,
  },
});

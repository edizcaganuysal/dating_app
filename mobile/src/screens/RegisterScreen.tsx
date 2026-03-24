import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { AuthStackParamList } from "../navigation/AppNavigator";
import { colors, typography, spacing, radii, shadows, animations } from "../theme";
import { AnimatedButton } from "../components";
import { haptic } from "../utils/haptics";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const TOTAL_STEPS = 3;

const VALID_DOMAINS = [".edu", ".utoronto.ca", ".mail.utoronto.ca", ".yorku.ca", ".ryerson.ca", ".torontomu.ca", ".ocadu.ca"];

function isUniversityEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1] || "";
  return VALID_DOMAINS.some((d) => {
    const suffix = d.replace(/^\./, "");
    return domain === suffix || domain.endsWith("." + suffix);
  });
}

type FieldErrors = Record<string, string>;

// ---------- Password strength ----------

type PasswordStrength = "weak" | "medium" | "strong";

function getPasswordStrength(pw: string): PasswordStrength {
  if (pw.length < 6) return "weak";
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  if (pw.length >= 8 && hasUpper && hasNumber) return "strong";
  if (hasUpper || pw.length >= 8) return "medium";
  return "weak";
}

const STRENGTH_CONFIG: Record<PasswordStrength, { color: string; width: string; label: string }> = {
  weak: { color: colors.error, width: "33%", label: "Weak" },
  medium: { color: colors.warning, width: "66%", label: "Medium" },
  strong: { color: colors.success, width: "100%", label: "Strong" },
};

// ---------- Progress bar ----------

function ProgressBar({ step }: { step: number }) {
  const progress = useSharedValue(step / TOTAL_STEPS);

  React.useEffect(() => {
    progress.value = withSpring(step / TOTAL_STEPS, { damping: 15, stiffness: 120 });
  }, [step]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100])}%`,
  }));

  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.track}>
        <Animated.View style={[progressStyles.fill, fillStyle]} />
      </View>
      <Text style={progressStyles.stepText}>Step {step} of {TOTAL_STEPS}</Text>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  track: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  stepText: {
    ...typography.labelSmall,
    color: colors.gray,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});

// ---------- Main component ----------

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);

  // Per-field errors shown inline
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Tracks which fields have been blurred at least once
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // Email validity for green checkmark
  const [emailValid, setEmailValid] = useState(false);
  // Server / general error
  const [serverError, setServerError] = useState("");

  // ---------- Inline validation ----------

  const validateField = useCallback(
    (field: string): string => {
      switch (field) {
        case "firstName":
          return !firstName.trim() ? "First name is required." : "";
        case "lastName":
          return !lastName.trim() ? "Last name is required." : "";
        case "email": {
          const trimmed = email.trim();
          if (!trimmed) return "Email is required.";
          if (!trimmed.includes("@")) return "Enter a valid email address.";
          if (!isUniversityEmail(trimmed)) {
            const domain = trimmed.split("@")[1] || "";
            return `'${domain}' is not a recognized university email.`;
          }
          return "";
        }
        case "password": {
          if (!password) return "Password is required.";
          if (password.length < 8) return "Must be at least 8 characters.";
          if (!/[A-Z]/.test(password))
            return "Must contain at least one uppercase letter.";
          return "";
        }
        case "age": {
          const ageNum = parseInt(age, 10);
          if (!age.trim()) return "Age is required.";
          if (isNaN(ageNum) || ageNum < 18 || ageNum > 99)
            return "Age must be between 18 and 99.";
          return "";
        }
        default:
          return "";
      }
    },
    [firstName, lastName, email, password, age]
  );

  const handleBlur = useCallback(
    (field: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const err = validateField(field);
      setFieldErrors((prev) => ({ ...prev, [field]: err }));

      if (field === "email") {
        setEmailValid(err === "" && email.trim().length > 0);
      }
    },
    [validateField, email]
  );

  // ---------- Step validation ----------

  const fieldsForStep = (s: number): string[] => {
    switch (s) {
      case 1:
        return ["firstName", "lastName", "email"];
      case 2:
        return ["password", "age"];
      case 3:
        return []; // gender has no validation
      default:
        return [];
    }
  };

  const validateStep = (s: number): boolean => {
    const fields = fieldsForStep(s);
    const newErrors: FieldErrors = {};
    const newTouched: Record<string, boolean> = {};
    let valid = true;
    for (const f of fields) {
      newTouched[f] = true;
      const err = validateField(f);
      newErrors[f] = err;
      if (err) valid = false;
    }
    setTouched((prev) => ({ ...prev, ...newTouched }));
    setFieldErrors((prev) => ({ ...prev, ...newErrors }));
    if (fields.includes("email")) {
      setEmailValid(!newErrors.email && email.trim().length > 0);
    }
    return valid;
  };

  // ---------- Navigation ----------

  const handleNext = () => {
    if (!validateStep(step)) {
      haptic.error();
      return;
    }
    haptic.light();
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    haptic.selection();
    setStep((s) => s - 1);
  };

  // ---------- Full validation (same rules as original) ----------

  function validate(): string[] {
    const errs: string[] = [];
    if (!firstName.trim()) errs.push("First name is required.");
    if (!lastName.trim()) errs.push("Last name is required.");
    if (!email.trim()) {
      errs.push("Email is required.");
    } else if (!email.includes("@")) {
      errs.push("Enter a valid email address.");
    } else if (!isUniversityEmail(email.trim())) {
      const domain = email.trim().split("@")[1] || "";
      errs.push(
        `'${domain}' is not a recognized university email. Use your .utoronto.ca, .yorku.ca, or .edu email.`
      );
    }
    if (!password) {
      errs.push("Password is required.");
    } else {
      if (password.length < 8) errs.push("Password must be at least 8 characters.");
      if (!/[A-Z]/.test(password))
        errs.push("Password must contain at least one uppercase letter.");
    }
    const ageNum = parseInt(age, 10);
    if (!age.trim()) {
      errs.push("Age is required.");
    } else if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      errs.push("Age must be between 18 and 99.");
    }
    return errs;
  }

  // ---------- Submit ----------

  async function handleRegister() {
    // Run full validation as safety net
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setServerError(validationErrors[0]);
      haptic.error();
      return;
    }
    setServerError("");
    setLoading(true);
    try {
      const result = await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: "",
        gender,
        age: parseInt(age, 10),
      });
      haptic.success();
      navigation.navigate("VerifyEmail", {
        email: email.trim().toLowerCase(),
        otp: result.otp,
        password,
      });
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (detail) {
        setServerError(detail);
      } else if (error.code === "ERR_NETWORK" || error.message?.includes("Network")) {
        setServerError(
          `Cannot reach the server. Make sure the backend is running. (${error.message})`
        );
      } else {
        setServerError(`Unexpected error: ${error.message || String(error)}`);
      }
      haptic.error();
    } finally {
      setLoading(false);
    }
  }

  // ---------- Helpers for inline error rendering ----------

  const showError = (field: string) => touched[field] && !!fieldErrors[field];

  const renderFieldError = (field: string) =>
    showError(field) ? (
      <Text style={styles.fieldError}>{fieldErrors[field]}</Text>
    ) : null;

  const inputBorderStyle = (field: string, extraValid?: boolean) => {
    if (showError(field)) return styles.inputError;
    if (extraValid) return styles.inputValid;
    return undefined;
  };

  // ---------- Step renderers ----------

  const renderStep1 = () => (
    <Animated.View
      key="step1"
      entering={FadeInRight.duration(300)}
      exiting={FadeOutLeft.duration(150)}
    >
      <Text style={styles.stepTitle}>What's your name?</Text>
      <Text style={styles.stepSubtitle}>
        Use the name you go by -- this will be visible to your group.
      </Text>

      <TextInput
        style={[styles.input, inputBorderStyle("firstName")]}
        placeholder="First Name"
        placeholderTextColor={colors.grayLight}
        value={firstName}
        onChangeText={setFirstName}
        onBlur={() => handleBlur("firstName")}
        autoCorrect={false}
        autoFocus
        testID="first-name-input"
      />
      {renderFieldError("firstName")}

      <TextInput
        style={[styles.input, inputBorderStyle("lastName")]}
        placeholder="Last Name"
        placeholderTextColor={colors.grayLight}
        value={lastName}
        onChangeText={setLastName}
        onBlur={() => handleBlur("lastName")}
        autoCorrect={false}
        testID="last-name-input"
      />
      {renderFieldError("lastName")}

      <View style={styles.emailWrapper}>
        <TextInput
          style={[styles.input, { marginBottom: 0 }, inputBorderStyle("email", emailValid)]}
          placeholder="Email (e.g. you@mail.utoronto.ca)"
          placeholderTextColor={colors.grayLight}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailValid(false);
          }}
          onBlur={() => handleBlur("email")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          testID="email-input"
        />
        {emailValid && (
          <View style={styles.checkIcon}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          </View>
        )}
      </View>
      {renderFieldError("email")}
      {!showError("email") && (
        <Text style={styles.hint}>
          Must be a university email (.utoronto.ca, .yorku.ca, .edu, etc.)
        </Text>
      )}

      <View style={styles.buttonRow}>
        <AnimatedButton
          label="Next"
          onPress={handleNext}
          variant="primary"
          size="lg"
          fullWidth
          iconRight="arrow-forward"
        />
      </View>
    </Animated.View>
  );

  const renderStep2 = () => {
    const strength = password.length > 0 ? getPasswordStrength(password) : null;
    const cfg = strength ? STRENGTH_CONFIG[strength] : null;

    return (
      <Animated.View
        key="step2"
        entering={FadeInRight.duration(300)}
        exiting={FadeOutLeft.duration(150)}
      >
        <Text style={styles.stepTitle}>Secure your account</Text>
        <Text style={styles.stepSubtitle}>
          Choose a strong password and tell us your age.
        </Text>

        <TextInput
          style={[styles.input, inputBorderStyle("password")]}
          placeholder="Password"
          placeholderTextColor={colors.grayLight}
          value={password}
          onChangeText={setPassword}
          onBlur={() => handleBlur("password")}
          secureTextEntry
          autoFocus
          testID="password-input"
        />

        {/* Password strength bar */}
        {password.length > 0 && cfg && (
          <View style={strengthStyles.container}>
            <View style={strengthStyles.track}>
              <View
                style={[
                  strengthStyles.fill,
                  { width: cfg.width as any, backgroundColor: cfg.color },
                ]}
              />
            </View>
            <Text style={[strengthStyles.label, { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </View>
        )}
        {renderFieldError("password")}
        {!showError("password") && password.length === 0 && (
          <Text style={styles.hint}>
            Min 8 characters, at least one uppercase letter
          </Text>
        )}

        <TextInput
          style={[styles.input, inputBorderStyle("age")]}
          placeholder="Age"
          placeholderTextColor={colors.grayLight}
          value={age}
          onChangeText={setAge}
          onBlur={() => handleBlur("age")}
          keyboardType="number-pad"
          testID="age-input"
        />
        {renderFieldError("age")}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.nextButtonWrapper}>
            <AnimatedButton
              label="Next"
              onPress={handleNext}
              variant="primary"
              size="lg"
              fullWidth
              iconRight="arrow-forward"
            />
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderStep3 = () => (
    <Animated.View
      key="step3"
      entering={FadeInRight.duration(300)}
      exiting={FadeOutLeft.duration(150)}
    >
      <Text style={styles.stepTitle}>Almost there!</Text>
      <Text style={styles.stepSubtitle}>
        Select your gender so we can build balanced groups.
      </Text>

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={[
            styles.genderButton,
            gender === "male" && styles.genderButtonActive,
          ]}
          onPress={() => {
            setGender("male");
            haptic.selection();
          }}
          testID="gender-male"
        >
          <Ionicons
            name="male"
            size={22}
            color={gender === "male" ? colors.primary : colors.gray}
            style={{ marginBottom: spacing.xs }}
          />
          <Text
            style={[
              styles.genderText,
              gender === "male" && styles.genderTextActive,
            ]}
          >
            Male
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.genderButton,
            gender === "female" && styles.genderButtonActive,
          ]}
          onPress={() => {
            setGender("female");
            haptic.selection();
          }}
          testID="gender-female"
        >
          <Ionicons
            name="female"
            size={22}
            color={gender === "female" ? colors.primary : colors.gray}
            style={{ marginBottom: spacing.xs }}
          />
          <Text
            style={[
              styles.genderText,
              gender === "female" && styles.genderTextActive,
            ]}
          >
            Female
          </Text>
        </TouchableOpacity>
      </View>

      {serverError !== "" && (
        <View style={styles.serverErrorBox}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.serverErrorText}>{serverError}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.nextButtonWrapper}>
          <AnimatedButton
            label="Create Account"
            onPress={handleRegister}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={loading}
            icon="sparkles"
          />
        </View>
      </View>
    </Animated.View>
  );

  // ---------- Render ----------

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create Account</Text>

        <ProgressBar step={step} />

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.loginLink}
        >
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.link}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------- Password strength styles ----------

const strengthStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.full,
  },
  label: {
    ...typography.captionSmall,
    fontWeight: "600",
    minWidth: 48,
  },
});

// ---------- Main styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xxxxl,
  },
  title: {
    ...typography.displaySmall,
    textAlign: "center",
    color: colors.primary,
    marginBottom: spacing.xxl,
  },
  stepTitle: {
    ...typography.headlineLarge,
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    ...typography.bodySmall,
    color: colors.gray,
    marginBottom: spacing.xxl,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg - 2,
    fontSize: 16,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    color: colors.dark,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  inputValid: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  fieldError: {
    ...typography.caption,
    color: colors.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    paddingLeft: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.gray,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
    paddingLeft: spacing.xs,
  },
  emailWrapper: {
    position: "relative",
    marginBottom: spacing.md,
  },
  checkIcon: {
    position: "absolute",
    right: spacing.md,
    top: 14,
  },
  label: {
    ...typography.labelLarge,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  genderRow: {
    flexDirection: "row",
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
  },
  genderButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSelected,
    ...shadows.sm,
  },
  genderText: {
    ...typography.bodyLarge,
    color: colors.darkSecondary,
  },
  genderTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  backText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  nextButtonWrapper: {
    flex: 1,
  },
  serverErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  serverErrorText: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },
  loginLink: {
    marginTop: spacing.xxl,
  },
  linkText: {
    textAlign: "center",
    color: colors.darkSecondary,
    ...typography.bodySmall,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
  },
});

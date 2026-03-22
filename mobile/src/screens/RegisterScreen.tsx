import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { AuthStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const VALID_DOMAINS = [".edu", ".utoronto.ca", ".mail.utoronto.ca", ".yorku.ca", ".ryerson.ca", ".torontomu.ca", ".ocadu.ca"];

function isUniversityEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1] || "";
  return VALID_DOMAINS.some((d) => {
    const suffix = d.replace(/^\./, "");
    return domain === suffix || domain.endsWith("." + suffix);
  });
}

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

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
      errs.push(`'${domain}' is not a recognized university email. Use your .utoronto.ca, .yorku.ca, or .edu email.`);
    }

    if (!password) {
      errs.push("Password is required.");
    } else {
      if (password.length < 8) errs.push("Password must be at least 8 characters.");
      if (!/[A-Z]/.test(password)) errs.push("Password must contain at least one uppercase letter.");
    }

    const ageNum = parseInt(age, 10);
    if (!age.trim()) {
      errs.push("Age is required.");
    } else if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      errs.push("Age must be between 18 and 99.");
    }

    return errs;
  }

  async function handleRegister() {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);

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
      navigation.navigate("VerifyEmail", {
        email: email.trim().toLowerCase(),
        otp: result.otp,
        password,
      });
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (detail) {
        setErrors([detail]);
      } else if (error.code === "ERR_NETWORK" || error.message?.includes("Network")) {
        setErrors([`Cannot reach the server. Make sure the backend is running. (${error.message})`]);
      } else {
        setErrors([`Unexpected error: ${error.message || String(error)}`]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Create Account</Text>

        {errors.length > 0 && (
          <View style={styles.errorBox}>
            {errors.map((err, i) => (
              <Text key={i} style={styles.errorText}>• {err}</Text>
            ))}
          </View>
        )}

        <TextInput
          style={[styles.input, !firstName.trim() && errors.length > 0 && styles.inputError]}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          autoCorrect={false}
          testID="first-name-input"
        />
        <TextInput
          style={[styles.input, !lastName.trim() && errors.length > 0 && styles.inputError]}
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          autoCorrect={false}
          testID="last-name-input"
        />
        <TextInput
          style={[styles.input, errors.some(e => e.includes("email")) && styles.inputError]}
          placeholder="Email (e.g. you@mail.utoronto.ca)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          testID="email-input"
        />
        <Text style={styles.hint}>
          Must be a university email (.utoronto.ca, .yorku.ca, .edu, etc.)
        </Text>
        <TextInput
          style={[styles.input, errors.some(e => e.includes("assword")) && styles.inputError]}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="password-input"
        />
        <Text style={styles.hint}>
          Min 8 characters, at least one uppercase letter
        </Text>
        <TextInput
          style={[styles.input, errors.some(e => e.includes("Age")) && styles.inputError]}
          placeholder="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          testID="age-input"
        />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[
              styles.genderButton,
              gender === "male" && styles.genderButtonActive,
            ]}
            onPress={() => setGender("male")}
            testID="gender-male"
          >
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
            onPress={() => setGender("female")}
            testID="gender-female"
          >
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

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
          testID="register-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.link}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#E91E63",
    marginBottom: 30,
  },
  errorBox: {
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#EF9A9A",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#C62828",
    fontSize: 14,
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  inputError: {
    borderColor: "#EF5350",
    backgroundColor: "#FFF8F8",
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 12,
    marginTop: -8,
    paddingLeft: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  genderRow: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  genderButtonActive: {
    borderColor: "#E91E63",
    backgroundColor: "#FCE4EC",
  },
  genderText: {
    fontSize: 16,
    color: "#666",
  },
  genderTextActive: {
    color: "#E91E63",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#E91E63",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  linkText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  },
  link: {
    color: "#E91E63",
    fontWeight: "600",
  },
});

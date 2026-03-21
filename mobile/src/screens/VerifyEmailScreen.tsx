import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { AuthStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyEmail">;

export default function VerifyEmailScreen({ navigation, route }: Props) {
  const { verifyEmail } = useAuth();
  const { email, otp: devOtp } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (otp.length !== 6) {
      Alert.alert("Error", "Please enter a 6-digit code");
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email, otp);
      navigation.navigate("Login", {
        message: "Email verified! Please log in.",
      });
    } catch (error: any) {
      const message =
        error.response?.data?.detail || "Verification failed. Please try again.";
      Alert.alert("Verification Failed", message);
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
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to:
        </Text>
        <Text style={styles.email}>{email}</Text>

        {devOtp && (
          <View style={styles.devBox}>
            <Text style={styles.devLabel}>Dev Mode - Your OTP:</Text>
            <Text style={styles.devOtp}>{devOtp}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="000000"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          testID="otp-input"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleVerify}
          disabled={loading}
          testID="verify-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#E91E63",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
    color: "#333",
    marginBottom: 24,
  },
  devBox: {
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  devLabel: {
    fontSize: 12,
    color: "#E65100",
    marginBottom: 4,
  },
  devOtp: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#E65100",
    letterSpacing: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    fontSize: 24,
    marginBottom: 20,
    backgroundColor: "#f9f9f9",
    letterSpacing: 8,
  },
  button: {
    backgroundColor: "#E91E63",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

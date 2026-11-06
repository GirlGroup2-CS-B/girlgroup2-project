import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

type AuthResponse = {
  access_token?: string;
  detail?: string | { msg: string }[];
};

function getErrorMessage(detail: AuthResponse["detail"], status: number): string {
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map((error) => error.msg).join(". ");
  }
  return `The request failed (${status}). Please try again.`;
}

export default function App() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [session, setSession] = useState<{ email: string; token: string } | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setMessage("");
    setIsError(false);
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_URL}/api/auth/${isRegistering ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      const result = (await response.json()) as AuthResponse;
      if (!response.ok) {
        throw new Error(getErrorMessage(result.detail, response.status));
      }

      if (isRegistering) {
        setMessage("Account created. You can now log in.");
        setIsRegistering(false);
        setPassword("");
      } else {
        if (!result.access_token) {
          throw new Error("The login response did not include an access token.");
        }
        setSession({
          email: email.trim().toLowerCase(),
          token: result.access_token,
        });
      }
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to reach the API.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.brandMark}>
              <Text style={styles.brandText}>G2</Text>
            </View>
            <Text style={styles.eyebrow}>GIRLGROUP2</Text>
            <Text style={styles.title}>
              {session
                ? "Welcome back"
                : isRegistering
                  ? "Create your account"
                  : "Welcome back"}
            </Text>
            <Text style={styles.muted}>
              {session
                ? `Signed in as ${session.email}`
                : isRegistering
                  ? "Create an account to get started."
                  : "Sign in to continue to your account."}
            </Text>

            {session ? (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setSession(null);
                  setMessage("");
                }}
              >
                <Text style={styles.secondaryButtonText}>Sign out</Text>
              </Pressable>
            ) : (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  maxLength={254}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#9993a2"
                  style={styles.input}
                  value={email}
                />
                <Text style={styles.label}>Password</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  maxLength={128}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#9993a2"
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />

                {message ? (
                  <Text
                    accessibilityRole="alert"
                    style={[styles.message, isError ? styles.error : styles.success]}
                  >
                    {message}
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting || !email || password.length < 8}
                  onPress={submit}
                  style={[
                    styles.primaryButton,
                    (isSubmitting || !email || password.length < 8) &&
                      styles.disabledButton,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {isRegistering ? "Create account" : "Sign in"}
                    </Text>
                  )}
                </Pressable>

                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>
                    {isRegistering ? "Already have an account? " : "New here? "}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setIsRegistering(!isRegistering);
                      setMessage("");
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.switchLink}>
                      {isRegistering ? "Sign in" : "Create an account"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f3fb",
  },
  keyboard: {
    flex: 1,
  },
  page: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    padding: 28,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    shadowColor: "#302044",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
  },
  brandMark: {
    width: 48,
    height: 48,
    marginBottom: 22,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7550a8",
  },
  brandText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  eyebrow: {
    marginBottom: 8,
    color: "#7550a8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    color: "#24212c",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  muted: {
    marginTop: 10,
    marginBottom: 22,
    color: "#716d78",
    fontSize: 15,
    lineHeight: 23,
  },
  label: {
    marginTop: 10,
    marginBottom: 8,
    color: "#24212c",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#ded9e5",
    borderRadius: 10,
    color: "#24212c",
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 48,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#7550a8",
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f1edf6",
  },
  secondaryButtonText: {
    color: "#56377e",
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 22,
  },
  switchText: {
    color: "#716d78",
    fontSize: 14,
  },
  switchLink: {
    color: "#694594",
    fontSize: 14,
    fontWeight: "700",
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: "#b42318",
  },
  success: {
    color: "#147a43",
  },
});

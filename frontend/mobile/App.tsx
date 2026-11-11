import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

const expoHostUri = Constants.expoConfig?.hostUri;
const expoHost = (() => {
  if (!expoHostUri) return undefined;
  try {
    return new URL(`http://${expoHostUri}`).hostname;
  } catch {
    return undefined;
  }
})();
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function getApiUrl() {
  const browserHost =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.hostname
      : undefined;
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      const isValidApiUrl =
        ["http:", "https:"].includes(url.protocol) &&
        !/[<>]/.test(configuredUrl) &&
        Boolean(url.hostname);
      if (isValidApiUrl) {
        if (LOCAL_HOSTS.has(url.hostname)) {
          if (browserHost && !LOCAL_HOSTS.has(browserHost)) {
            url.hostname = browserHost;
          } else if (expoHost) {
            url.hostname = expoHost;
          }
        }
        return url.toString().replace(/\/$/, "");
      }
    } catch {
      // Fall back to the host available at runtime for invalid/example values.
    }
  }

  if (browserHost && !LOCAL_HOSTS.has(browserHost)) {
    return `http://${browserHost}:3000`;
  }
  if (expoHost) return `http://${expoHost}:3000`;
  return Platform.OS === "android"
    ? "http://10.0.2.2:3000"
    : "http://localhost:3000";
}

const API_URL = getApiUrl();

const categories = [
  "Bags",
  "Documents",
  "Electronics",
  "Clothing",
  "Accessories",
  "Personal items",
  "Other",
];

type AccountRole = "user" | "admin";
type ItemType = "LOST" | "FOUND";
type Tab =
  | "Home"
  | "Lost"
  | "Found"
  | "Matches"
  | "My Reports"
  | "My Claims"
  | "Alerts"
  | "Profile"
  | "Review Queue";

type Session = {
  email: string;
  token: string;
  role: AccountRole;
};

type CampusItem = {
  report_id: number | string;
  user_id: number | string;
  item_name: string;
  category: string;
  description: string;
  report_type: ItemType;
  date_lost_or_found: string;
  location: string;
  listing_status: string;
  reporter_name?: string;
};

type Claim = {
  claim_id: number | string;
  claim_reference?: string;
  item_id: number | string;
  item_name?: string;
  explanation: string;
  claim_status: string;
  created_at?: string;
  claimant_name?: string;
  distinctive_item_details?: string;
};

type NotificationItem = {
  notification_id: number | string;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
};

type ApiOptions = {
  token?: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
};

type AuthResponse = {
  access_token?: string;
  role?: string;
  error?: string;
  detail?: string;
  message?: string;
};

const readApiError = (body: unknown, status: number) => {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = body.error;
    if (typeof error === "string") return error;
  }
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = body.detail;
    if (typeof detail === "string") return detail;
  }
  return `Request failed (${status}). Please try again.`;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.token
          ? { Authorization: `Bearer ${options.token}` }
          : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `CampusFind API at ${API_URL} did not respond. Make sure the backend is running, your phone and computer are on the same Wi-Fi, and Windows Firewall allows Node.js on private networks.`,
      );
    }
    throw new Error(
      `Cannot reach CampusFind API at ${API_URL}. Make sure the backend is running, your phone and computer are on the same Wi-Fi, and Windows Firewall allows Node.js on private networks. If this is not your computer's LAN address, restart Expo with "npm.cmd run start:clear".`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const result: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiError(result, response.status));
  }
  return result as T;
}

function getItems(data: { items?: CampusItem[] }): CampusItem[] {
  if (!Array.isArray(data.items)) {
    throw new Error("The server returned an invalid reports response.");
  }
  return data.items;
}

function getClaims(data: { claims?: Claim[] }) {
  if (!Array.isArray(data.claims)) {
    throw new Error("The server returned an invalid claims response.");
  }
  return data.claims;
}

function getNotifications(data: { notifications?: NotificationItem[] }) {
  if (!Array.isArray(data.notifications)) {
    throw new Error("The server returned an invalid notifications response.");
  }
  return data.notifications;
}

function localDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(value?: string) {
  if (!value) return "Date not available";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayCategory(value: string) {
  if (value === "Bags and Wallets") return "Bags";
  if (value === "Identification Cards") return "Documents";
  if (value === "Keys" || value === "School Supplies") return "Personal items";
  return value;
}

function apiCategory(value: string) {
  if (value === "Bags") return "Bags and Wallets";
  if (value === "Documents") return "Identification Cards";
  if (value === "Personal items") return "Other";
  return value;
}

function isValidReportDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > localDate()) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function AppButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.secondaryButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8b8791"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

function ItemCard({
  item,
  onPress,
}: {
  item: CampusItem;
  onPress: () => void;
}) {
  const found = item.report_type === "FOUND";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.itemCard, pressed && styles.pressed]}
    >
      <View style={[styles.itemIcon, found && styles.foundIcon]}>
        <Text style={styles.itemIconText}>{found ? "✓" : "⌕"}</Text>
      </View>
      <View style={styles.itemInfo}>
        <View style={styles.itemTopLine}>
          <Text style={[styles.itemType, found && styles.foundText]}>
            {found ? "FOUND" : "LOST"}
          </Text>
          <Text style={styles.itemDate}>
            {formatDate(item.date_lost_or_found)}
          </Text>
        </View>
        <Text style={styles.itemName}>{item.item_name}</Text>
        <Text style={styles.itemMeta}>
          {displayCategory(item.category)} · {item.location}
        </Text>
        <Text style={styles.itemMeta}>
          Status: {item.listing_status}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function App() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const [tab, setTab] = useState<Tab>("Home");
  const [items, setItems] = useState<CampusItem[]>([]);
  const [myItems, setMyItems] = useState<CampusItem[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingItems, setPendingItems] = useState<CampusItem[]>([]);
  const [pendingClaims, setPendingClaims] = useState<Claim[]>([]);
  const [selectedItem, setSelectedItem] = useState<CampusItem | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");

  const [reportType, setReportType] = useState<ItemType>("LOST");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] =
    useState<(typeof categories)[number]>("Other");
  const [location, setLocation] = useState("");
  const [reportDate, setReportDate] = useState(localDate());
  const [description, setDescription] = useState("");
  const [claimExplanation, setClaimExplanation] = useState("");
  const [claimDetails, setClaimDetails] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (!session) return;
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setMessage("");
      setIsError(false);

      const results = await Promise.allSettled([
        apiRequest<{ items?: CampusItem[] }>("/api/items"),
        apiRequest<{ items?: CampusItem[] }>("/api/items/mine", {
          token: session.token,
        }),
        apiRequest<{ claims?: Claim[] }>("/api/claims/my", {
          token: session.token,
        }),
        apiRequest<{ notifications?: NotificationItem[] }>(
          "/api/notifications",
          { token: session.token },
        ),
        ...(session.role === "admin"
          ? [
              apiRequest<{ items?: CampusItem[] }>("/api/items/review-queue", {
                token: session.token,
              }),
              apiRequest<{ claims?: Claim[] }>("/api/claims/pending", {
                token: session.token,
              }),
            ]
          : []),
      ]);

      try {
        const [publicItems, ownItems, ownClaims, ownNotifications] = results;
        if (publicItems.status === "fulfilled") {
          setItems(getItems(publicItems.value));
        }
        if (ownItems.status === "fulfilled") {
          setMyItems(getItems(ownItems.value));
        }
        if (ownClaims.status === "fulfilled") {
          setClaims(getClaims(ownClaims.value));
        }
        if (ownNotifications.status === "fulfilled") {
          setNotifications(getNotifications(ownNotifications.value));
        }
        if (session.role === "admin") {
          const pendingItems =
            results[4] as PromiseSettledResult<{ items?: CampusItem[] }> | undefined;
          const pendingClaims =
            results[5] as PromiseSettledResult<{ claims?: Claim[] }> | undefined;
          if (pendingItems?.status === "fulfilled") {
            setPendingItems(getItems(pendingItems.value));
          }
          if (pendingClaims?.status === "fulfilled") {
            setPendingClaims(getClaims(pendingClaims.value));
          }
        }
        const failedRequest = results.find(
          (result) => result.status === "rejected",
        );
        if (failedRequest?.status === "rejected") {
          setMessage(
            getErrorMessage(
              failedRequest.reason,
              "Unable to load CampusFind data.",
            ),
          );
          setIsError(true);
        }
      } catch (error) {
        setMessage(getErrorMessage(error, "Unable to load CampusFind data."));
        setIsError(true);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [session],
  );

  useEffect(() => {
    if (session) void loadData();
  }, [loadData, session]);

  const visibleItems = useMemo(() => {
    const source =
      tab === "My Reports"
        ? myItems
        : items.filter((item) => item.listing_status !== "Pending Review");
    const typeFilter =
      tab === "Lost" ? "LOST" : tab === "Found" ? "FOUND" : null;
    const search = query.trim().toLowerCase();
    return source.filter((item) => {
      if (typeFilter && item.report_type !== typeFilter) return false;
      if (
        categoryFilter !== "All categories" &&
        displayCategory(item.category) !== categoryFilter
      ) {
        return false;
      }
      if (!search) return true;
      return `${item.item_name} ${displayCategory(item.category)} ${item.location} ${item.description}`
        .toLowerCase()
        .includes(search);
    });
  }, [categoryFilter, items, myItems, query, tab]);

  const possibleMatches = useMemo(
    () => items.filter((item) => item.listing_status === "Possible match"),
    [items],
  );

  async function submitAuth() {
    setMessage("");
    setIsError(false);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setMessage("Enter your email and password.");
      setIsError(true);
      return;
    }
    if (
      isRegistering &&
      (!fullName.trim() || !studentId.trim() || password.length < 8)
    ) {
      setMessage(
        "Enter your full name and student ID. Passwords must be at least 8 characters.",
      );
      setIsError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await apiRequest("/api/auth/register", {
          method: "POST",
          body: {
            full_name: fullName.trim(),
            student_id: studentId.trim(),
            email: normalizedEmail,
            password,
          },
        });
        setIsRegistering(false);
        setPassword("");
        setMessage("Account created. Sign in with your email and password.");
      } else {
        const result = await apiRequest<AuthResponse>("/api/auth/login", {
          method: "POST",
          body: { email: normalizedEmail, password },
        });
        if (!result.access_token) {
          throw new Error("The server did not return a sign-in token.");
        }
        setSession({
          email: normalizedEmail,
          token: result.access_token,
          role: result.role === "admin" ? "admin" : "user",
        });
        setTab("Home");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Sign-in request failed.",
      );
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  function signOut() {
    setSession(null);
    setItems([]);
    setMyItems([]);
    setClaims([]);
    setNotifications([]);
    setPendingItems([]);
    setPendingClaims([]);
    setSelectedItem(null);
    setIsReporting(false);
    setTab("Home");
    setQuery("");
    setCategoryFilter("All categories");
    setPassword("");
    setMessage("");
  }

  async function submitReport() {
    if (!session) return;
    if (
      !itemName.trim() ||
      !location.trim() ||
      !description.trim() ||
      !isValidReportDate(reportDate)
    ) {
      setMessage(
        "Complete all required fields and enter a valid date that is not in the future.",
      );
      setIsError(true);
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      const result = await apiRequest<{ item?: CampusItem }>(
        "/api/items",
        {
          token: session.token,
          method: "POST",
          body: {
            item_name: itemName.trim(),
            category: apiCategory(category),
            description: description.trim(),
            report_type: reportType,
            date_lost_or_found: reportDate,
            location: location.trim(),
          },
        },
      );
      if (!result.item) throw new Error("The server did not return your report.");
      setMyItems((current) => [result.item!, ...current]);
      setItemName("");
      setLocation("");
      setDescription("");
      setReportDate(localDate());
      setCategory("Other");
      setIsReporting(false);
      setTab("My Reports");
      setQuery("");
      setCategoryFilter("All categories");
      setMessage("Your report was saved and sent for review.");
      setIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save report.");
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  }

  async function submitClaim() {
    if (!session || !selectedItem) return;
    if (!claimExplanation.trim() || !claimDetails.trim()) {
      setMessage("Explain your claim and describe a detail that proves ownership.");
      setIsError(true);
      return;
    }
    setIsSaving(true);
    try {
      await apiRequest("/api/claims", {
        token: session.token,
        method: "POST",
        body: {
          item_id: selectedItem.report_id,
          explanation: claimExplanation.trim(),
          distinctive_item_details: claimDetails.trim(),
          approximate_location_lost: selectedItem.location,
        },
      });
      setClaimExplanation("");
      setClaimDetails("");
      setSelectedItem(null);
      setTab("My Claims");
      setMessage("Your claim was submitted.");
      setIsError(false);
      await loadData(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit claim.");
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteReport(item: CampusItem) {
    if (!session) return;
    try {
      await apiRequest(`/api/items/${item.report_id}`, {
        token: session.token,
        method: "DELETE",
      });
      setMyItems((current) =>
        current.filter((entry) => entry.report_id !== item.report_id),
      );
      setItems((current) =>
        current.filter((entry) => entry.report_id !== item.report_id),
      );
      setSelectedItem(null);
      setMessage("Your report was removed.");
      setIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove report.");
      setIsError(true);
    }
  }

  async function markNotificationRead(notification: NotificationItem) {
    if (!session || notification.read_status) return;
    try {
      await apiRequest(`/api/notifications/${notification.notification_id}/read`, {
        token: session.token,
        method: "PATCH",
      });
      setNotifications((current) =>
        current.map((item) =>
          item.notification_id === notification.notification_id
            ? { ...item, read_status: true }
            : item,
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update alert.");
      setIsError(true);
    }
  }

  async function reviewItem(item: CampusItem, status: "approved" | "rejected") {
    if (!session) return;
    try {
      await apiRequest(`/api/items/${item.report_id}/review`, {
        token: session.token,
        method: "PATCH",
        body: { status },
      });
      setPendingItems((current) =>
        current.filter((entry) => entry.report_id !== item.report_id),
      );
      if (status === "approved") {
        await loadData(true);
      }
      setMessage(`Report ${status}.`);
      setIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not review report.");
      setIsError(true);
    }
  }

  async function reviewClaim(
    claim: Claim,
    status: "approved" | "rejected",
  ) {
    if (!session) return;
    try {
      await apiRequest(`/api/claims/${claim.claim_id}/review`, {
        token: session.token,
        method: "PATCH",
        body: { claim_status: status },
      });
      setPendingClaims((current) =>
        current.filter((entry) => entry.claim_id !== claim.claim_id),
      );
      setClaims((current) =>
        current.map((entry) =>
          entry.claim_id === claim.claim_id
            ? { ...entry, claim_status: status }
            : entry,
        ),
      );
      setMessage(`Claim ${status}.`);
      setIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not review claim.");
      setIsError(true);
    }
  }

  function changeTab(nextTab: Tab) {
    setTab(nextTab);
    setSelectedItem(null);
    setIsReporting(false);
    setQuery("");
    setCategoryFilter("All categories");
    setMessage("");
    setIsError(false);
  }

  if (!session) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.authScroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.authCard}>
                <View style={styles.logoBox}>
                  <Text style={styles.logoText}>CF</Text>
                </View>
                <Text style={styles.eyebrow}>JRMSU MAIN CAMPUS</Text>
                <Text style={styles.title}>
                  {isRegistering ? "Create your account" : "CampusFind"}
                </Text>
                <Text style={styles.muted}>
                  {isRegistering
                    ? "Join the campus lost-and-found community."
                    : "Sign in to report and find campus items."}
                </Text>

                {isRegistering ? (
                  <>
                    <InputField
                      label="Full name"
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Your full name"
                      autoCapitalize="words"
                    />
                    <InputField
                      label="Student ID"
                      value={studentId}
                      onChangeText={setStudentId}
                      placeholder="Your student or staff ID"
                      autoCapitalize="none"
                    />
                  </>
                ) : null}
                <InputField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <InputField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder={
                    isRegistering ? "At least 8 characters" : "Your password"
                  }
                  secureTextEntry
                  autoCapitalize="none"
                />

                {message ? (
                  <Text style={[styles.message, isError && styles.error]}>
                    {message}
                  </Text>
                ) : null}

                <AppButton
                  label={
                    isSubmitting
                      ? "Please wait..."
                      : isRegistering
                        ? "Create account"
                        : "Sign in"
                  }
                  onPress={() => void submitAuth()}
                  disabled={isSubmitting}
                />
                {isSubmitting ? (
                  <ActivityIndicator
                    style={styles.spinner}
                    color="#7550a8"
                  />
                ) : null}
                <View style={styles.switchRow}>
                  <Text style={styles.mutedSmall}>
                    {isRegistering
                      ? "Already registered? "
                      : "New to CampusFind? "}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setIsRegistering((current) => !current);
                      setMessage("");
                      setIsError(false);
                    }}
                  >
                    <Text style={styles.link}>
                      {isRegistering ? "Sign in" : "Create account"}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.apiHint}>API: {API_URL}</Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const tabs: Tab[] = [
    "Home",
    "Lost",
    "Found",
    "Matches",
    "My Reports",
    "My Claims",
    "Alerts",
    "Profile",
    ...(session.role === "admin" ? ["Review Queue" as const] : []),
  ];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <View style={styles.appHeader}>
          <View style={styles.headerBrand}>
            <View style={styles.smallLogo}>
              <Text style={styles.logoText}>CF</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>CampusFind</Text>
              <Text style={styles.headerSubtitle}>JRMSU Main Campus</Text>
            </View>
          </View>
          <Pressable onPress={signOut} hitSlop={8}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((entry) => (
            <Pressable
              key={entry}
              onPress={() => changeTab(entry)}
              style={[styles.tab, tab === entry && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === entry && styles.activeTabText,
                ]}
              >
                {entry === "Alerts" &&
                notifications.some((item) => !item.read_status)
                  ? `Alerts (${notifications.filter((item) => !item.read_status).length})`
                  : entry}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadData(true)}
              tintColor="#7550a8"
            />
          }
        >
          {message ? (
            <Pressable
              onPress={() => {
                setMessage("");
                setIsError(false);
              }}
              style={[styles.notice, isError && styles.errorNotice]}
            >
              <Text style={[styles.noticeText, isError && styles.error]}>
                {message}  ×
              </Text>
            </Pressable>
          ) : null}

          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#7550a8" size="large" />
              <Text style={styles.muted}>Loading your campus reports...</Text>
            </View>
          ) : selectedItem ? (
            <View style={styles.card}>
              <AppButton
                label="‹ Back to reports"
                onPress={() => setSelectedItem(null)}
                secondary
              />
              <Text
                style={[
                  styles.itemType,
                  selectedItem.report_type === "FOUND" && styles.foundText,
                  styles.detailType,
                ]}
              >
                {selectedItem.report_type} ITEM
              </Text>
              <Text style={styles.sectionTitle}>{selectedItem.item_name}</Text>
              <Text style={styles.detailText}>
                {selectedItem.description}
              </Text>
              <Text style={styles.detailText}>
                Category: {displayCategory(selectedItem.category)}
              </Text>
              <Text style={styles.detailText}>
                Location: {selectedItem.location}
              </Text>
              <Text style={styles.detailText}>
                Date: {formatDate(selectedItem.date_lost_or_found)}
              </Text>
              {selectedItem.reporter_name ? (
                <Text style={styles.detailText}>
                  Reported by: {selectedItem.reporter_name}
                </Text>
              ) : null}
              <Text style={styles.detailText}>
                Status: {selectedItem.listing_status}
              </Text>
              {String(selectedItem.user_id) ===
              String(
                myItems.find(
                  (item) => item.report_id === selectedItem.report_id,
                )?.user_id,
              ) ? (
                <AppButton
                  label="Delete my report"
                  onPress={() =>
                    Alert.alert(
                      "Delete report?",
                      "This will remove your report from active listings.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => void deleteReport(selectedItem),
                        },
                      ],
                    )
                  }
                  secondary
                />
              ) : null}
              <Text style={styles.sectionTitle}>Submit a claim</Text>
              <InputField
                label="Why is this item yours?"
                value={claimExplanation}
                onChangeText={setClaimExplanation}
                placeholder="Explain when or where you lost it"
                multiline
              />
              <InputField
                label="Identifying details"
                value={claimDetails}
                onChangeText={setClaimDetails}
                placeholder="Describe a detail only the owner would know"
                multiline
              />
              <AppButton
                label={isSaving ? "Submitting..." : "Submit claim"}
                onPress={() => void submitClaim()}
                disabled={isSaving}
              />
            </View>
          ) : isReporting ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Report an item</Text>
              <Text style={styles.fieldHint}>Choose a report type</Text>
              <View style={styles.choiceRow}>
                {(["LOST", "FOUND"] as const).map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setReportType(value)}
                    style={[
                      styles.choice,
                      reportType === value && styles.selectedChoice,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        reportType === value && styles.selectedChoiceText,
                      ]}
                    >
                      {titleCase(value)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <InputField
                label="Item name"
                value={itemName}
                onChangeText={setItemName}
                placeholder="e.g. Blue backpack"
              />
              <Text style={styles.fieldHint}>Category</Text>
              <View style={styles.categoryList}>
                {categories.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setCategory(value)}
                    style={[
                      styles.categoryChip,
                      category === value && styles.selectedChoice,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === value && styles.selectedChoiceText,
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <InputField
                label={reportType === "LOST" ? "Where was it lost?" : "Where was it found?"}
                value={location}
                onChangeText={setLocation}
                placeholder="Building or campus location"
              />
              <InputField
                label="Date (YYYY-MM-DD)"
                value={reportDate}
                onChangeText={setReportDate}
                placeholder={localDate()}
                autoCapitalize="none"
              />
              <InputField
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Color, identifying marks, or other details"
                multiline
              />
              <Text style={styles.fieldHint}>
                Photo upload is not available in the current backend.
              </Text>
              <AppButton
                label={isSaving ? "Saving..." : "Submit report"}
                onPress={() => void submitReport()}
                disabled={isSaving}
              />
              <AppButton
                label="Cancel"
                onPress={() => setIsReporting(false)}
                secondary
              />
            </View>
          ) : tab === "Review Queue" && session.role === "admin" ? (
            <View>
              <Text style={styles.sectionTitle}>Report review queue</Text>
              {pendingItems.length === 0 ? (
                <Text style={styles.empty}>No reports are waiting for review.</Text>
              ) : (
                pendingItems.map((item) => (
                  <View key={String(item.report_id)} style={styles.card}>
                    <Text style={styles.itemType}>{item.report_type} REPORT</Text>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    <Text style={styles.detailText}>
                      {item.category} · {item.location} ·{" "}
                      {formatDate(item.date_lost_or_found)}
                    </Text>
                    <Text style={styles.detailText}>{item.description}</Text>
                    <AppButton
                      label="Approve report"
                      onPress={() => void reviewItem(item, "approved")}
                    />
                    <AppButton
                      label="Reject report"
                      onPress={() => void reviewItem(item, "rejected")}
                      secondary
                    />
                  </View>
                ))
              )}
              <Text style={[styles.sectionTitle, styles.queueHeading]}>
                Claim review queue
              </Text>
              {pendingClaims.length === 0 ? (
                <Text style={styles.empty}>No claims are waiting for review.</Text>
              ) : (
                pendingClaims.map((claim) => (
                  <View key={String(claim.claim_id)} style={styles.card}>
                    <Text style={styles.itemName}>
                      {claim.item_name || `Item #${claim.item_id}`}
                    </Text>
                    <Text style={styles.detailText}>
                      Claimed by {claim.claimant_name || "Campus member"}
                    </Text>
                    <Text style={styles.detailText}>{claim.explanation}</Text>
                    <Text style={styles.detailText}>
                      Identifying details: {claim.distinctive_item_details}
                    </Text>
                    <AppButton
                      label="Approve claim"
                      onPress={() => void reviewClaim(claim, "approved")}
                    />
                    <AppButton
                      label="Reject claim"
                      onPress={() => void reviewClaim(claim, "rejected")}
                      secondary
                    />
                  </View>
                ))
              )}
            </View>
          ) : tab === "My Claims" ? (
            <View>
              <Text style={styles.sectionTitle}>My claims</Text>
              {claims.length === 0 ? (
                <Text style={styles.empty}>
                  You have not submitted any claims yet.
                </Text>
              ) : (
                claims.map((claim) => (
                  <View key={String(claim.claim_id)} style={styles.card}>
                    <Text style={styles.itemName}>
                      {claim.item_name || `Item #${claim.item_id}`}
                    </Text>
                    <Text style={styles.detailText}>{claim.explanation}</Text>
                    <Text style={styles.statusPill}>
                      {claim.claim_status}
                    </Text>
                    <Text style={styles.itemDate}>
                      {claim.claim_reference || formatDate(claim.created_at)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          ) : tab === "Alerts" ? (
            <View>
              <Text style={styles.sectionTitle}>Notifications</Text>
              {notifications.length === 0 ? (
                <Text style={styles.empty}>You have no notifications yet.</Text>
              ) : (
                notifications.map((notification) => (
                  <Pressable
                    key={String(notification.notification_id)}
                    onPress={() => void markNotificationRead(notification)}
                    style={[
                      styles.card,
                      !notification.read_status && styles.unreadCard,
                    ]}
                  >
                    <Text style={styles.itemName}>{notification.title}</Text>
                    <Text style={styles.detailText}>
                      {notification.message}
                    </Text>
                    <Text style={styles.itemDate}>
                      {formatDate(notification.created_at)} ·{" "}
                      {notification.read_status ? "Read" : "Tap to mark read"}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          ) : tab === "Matches" ? (
            <View>
              <Text style={styles.eyebrow}>A HELPING HAND</Text>
              <Text style={styles.sectionTitle}>Possible matches</Text>
              <Text style={styles.detailText}>
                Review related reports that may describe the same item.
              </Text>
              {possibleMatches.length === 0 ? (
                <Text style={styles.empty}>
                  No possible matches are available right now.
                </Text>
              ) : (
                possibleMatches.map((item) => (
                  <ItemCard
                    key={String(item.report_id)}
                    item={item}
                    onPress={() => setSelectedItem(item)}
                  />
                ))
              )}
            </View>
          ) : tab === "Profile" ? (
            <View style={styles.card}>
              <Text style={styles.eyebrow}>YOUR CAMPUSFIND ACCOUNT</Text>
              <Text style={styles.sectionTitle}>My account</Text>
              <Text style={styles.detailText}>Signed in as</Text>
              <Text style={styles.itemName}>{session.email}</Text>
              <Text style={styles.statusPill}>{session.role}</Text>
              <Text style={styles.detailText}>
                Your account role is assigned by CampusFind and verified when you sign in.
              </Text>
              <AppButton label="Sign out" onPress={signOut} secondary />
            </View>
          ) : (
            <View>
              <Text style={styles.eyebrow}>JRMSU MAIN CAMPUS</Text>
              <Text style={styles.sectionTitle}>
                {tab === "Home"
                  ? "Find what matters."
                  : tab === "My Reports"
                    ? "My reports"
                    : `${tab} items`}
              </Text>
              {tab === "Home" || tab === "Lost" || tab === "Found" ? (
                <AppButton
                  label="＋ Report lost or found item"
                  onPress={() => {
                    setReportType(tab === "Found" ? "FOUND" : "LOST");
                    setIsReporting(true);
                  }}
                />
              ) : null}
              <InputField
                label="Search reports"
                value={query}
                onChangeText={setQuery}
                placeholder="Search name, category, or location"
              />
              <Text style={styles.fieldHint}>Filter by category</Text>
              <View style={styles.categoryList}>
                {["All categories", ...categories].map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: categoryFilter === value }}
                    onPress={() => setCategoryFilter(value)}
                    style={[
                      styles.categoryChip,
                      categoryFilter === value && styles.selectedChoice,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        categoryFilter === value && styles.selectedChoiceText,
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {visibleItems.length === 0 ? (
                <Text style={styles.empty}>
                  {tab === "My Reports"
                    ? "You have not submitted any reports yet."
                    : "No reports found. Pull down to refresh or create a report."}
                </Text>
              ) : (
                visibleItems.map((item) => (
                  <ItemCard
                    key={String(item.report_id)}
                    item={item}
                    onPress={() => setSelectedItem(item)}
                  />
                ))
              )}
            </View>
          )}

          <Text style={styles.footer}>
            Signed in as {session.email} · {session.role}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f3fb" },
  flex: { flex: 1 },
  authScroll: { flexGrow: 1, justifyContent: "center", padding: 14 },
  authCard: {
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
  },
  logoBox: {
    width: 60,
    height: 60,
    backgroundColor: "#7550a8",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  smallLogo: {
    width: 38,
    height: 38,
    backgroundColor: "#7550a8",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  eyebrow: {
    color: "#7550a8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: { color: "#24212c", fontSize: 36, fontWeight: "800" },
  muted: { marginTop: 8, marginBottom: 24, color: "#716d78", fontSize: 16 },
  mutedSmall: { color: "#716d78", fontSize: 14 },
  field: { marginTop: 18 },
  label: {
    marginBottom: 7,
    color: "#24212c",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 58,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ded9e5",
    borderRadius: 12,
    color: "#24212c",
    fontSize: 16,
    backgroundColor: "#fff",
  },
  multilineInput: { minHeight: 96, paddingTop: 12 },
  button: {
    minHeight: 60,
    paddingHorizontal: 14,
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#7550a8",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryButton: { backgroundColor: "#f1edf6" },
  secondaryButtonText: { color: "#56377e" },
  disabledButton: { opacity: 0.6 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 22,
  },
  link: { color: "#694594", fontSize: 14, fontWeight: "700" },
  message: { marginTop: 12, color: "#147a43", fontSize: 14, lineHeight: 20 },
  error: { color: "#b42318" },
  spinner: { marginTop: 10 },
  apiHint: { marginTop: 18, color: "#8b8791", textAlign: "center", fontSize: 11 },
  appHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: "#fff",
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#24212c" },
  headerSubtitle: { fontSize: 11, color: "#716d78", marginTop: 2 },
  signOut: { color: "#694594", fontSize: 13, fontWeight: "700" },
  tabs: { gap: 7, paddingHorizontal: 12, paddingVertical: 10 },
  tab: {
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  activeTab: { backgroundColor: "#7550a8" },
  tabText: { color: "#56377e", fontSize: 12, fontWeight: "700" },
  activeTabText: { color: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    color: "#24212c",
    fontSize: 23,
    fontWeight: "800",
    marginBottom: 12,
  },
  queueHeading: { marginTop: 22 },
  fieldHint: { marginTop: 12, color: "#716d78", fontSize: 13 },
  choiceRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  choice: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ded9e5",
    backgroundColor: "#fff",
  },
  selectedChoice: { backgroundColor: "#7550a8", borderColor: "#7550a8" },
  choiceText: { color: "#56377e", fontWeight: "700" },
  selectedChoiceText: { color: "#fff" },
  categoryList: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  categoryChip: {
    borderWidth: 1,
    borderColor: "#ded9e5",
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  categoryText: { color: "#56377e", fontSize: 12, fontWeight: "600" },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 10,
    padding: 13,
    backgroundColor: "#fff",
    borderRadius: 14,
  },
  pressed: { opacity: 0.75 },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f1edf6",
    alignItems: "center",
    justifyContent: "center",
  },
  foundIcon: { backgroundColor: "#eaf7ef" },
  itemIconText: { fontSize: 20, color: "#7550a8", fontWeight: "800" },
  itemInfo: { flex: 1 },
  itemTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  itemType: { color: "#7550a8", fontSize: 10, fontWeight: "800" },
  foundText: { color: "#147a43" },
  itemDate: { color: "#8b8791", fontSize: 11 },
  itemName: { color: "#24212c", fontSize: 15, fontWeight: "700" },
  itemMeta: { color: "#716d78", fontSize: 12, marginTop: 3 },
  chevron: { color: "#8b8791", fontSize: 22 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 11,
  },
  detailType: { marginTop: 18, marginBottom: 7 },
  detailText: { color: "#56515e", fontSize: 14, lineHeight: 21, marginTop: 6 },
  statusPill: {
    color: "#694594",
    backgroundColor: "#f1edf6",
    alignSelf: "flex-start",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
  },
  empty: {
    color: "#716d78",
    textAlign: "center",
    paddingHorizontal: 22,
    paddingVertical: 34,
    lineHeight: 21,
  },
  notice: {
    backgroundColor: "#eaf7ef",
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
  },
  errorNotice: { backgroundColor: "#fff0ef" },
  noticeText: { color: "#147a43", fontSize: 13, lineHeight: 19 },
  unreadCard: { borderWidth: 1, borderColor: "#b69acf" },
  loading: { alignItems: "center", padding: 36 },
  footer: {
    color: "#8b8791",
    fontSize: 11,
    textAlign: "center",
    marginTop: 22,
  },
});

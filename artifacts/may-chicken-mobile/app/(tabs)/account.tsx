import { Feather } from "@expo/vector-icons";
import {
  useCustomerLogin,
  useCustomerLogout,
  useCustomerRegister,
  type CustomerSession,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth-context";

const MOBILE_HEADERS = { headers: { "x-client": "mobile" } };

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, setSession, signOut } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const login = useCustomerLogin({ request: MOBILE_HEADERS });
  const register = useCustomerRegister({ request: MOBILE_HEADERS });
  const logout = useCustomerLogout();

  const isPending = login.isPending || register.isPending;

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.background,
      borderColor: colors.border,
      color: colors.foreground,
    },
  ];

  const handleSession = async (session: CustomerSession) => {
    if (!session.token || !session.customer) {
      setFormError("Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
      return;
    }
    await setSession(session.token, {
      ownerType: "customer",
      name: [session.customer.firstName, session.customer.lastName]
        .filter(Boolean)
        .join(" "),
      email: session.customer.email,
    });
    setEmail("");
    setPassword("");
    setFirstName("");
    setFormError(null);
  };

  const submit = () => {
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    if (mode === "register") {
      if (!firstName.trim()) {
        setFormError("Bitte gib deinen Vornamen an.");
        return;
      }
      if (password.length < 6) {
        setFormError("Das Passwort muss mindestens 6 Zeichen haben.");
        return;
      }
      register.mutate(
        {
          data: {
            email: email.trim(),
            password,
            firstName: firstName.trim(),
          },
        },
        {
          onSuccess: handleSession,
          onError: () =>
            setFormError(
              "Registrierung fehlgeschlagen — ist die E-Mail schon vergeben?",
            ),
        },
      );
    } else {
      login.mutate(
        { data: { email: email.trim(), password } },
        {
          onSuccess: handleSession,
          onError: () => setFormError("E-Mail oder Passwort ist falsch."),
        },
      );
    }
  };

  const handleSignOut = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        signOut();
      },
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topInset + 16,
        paddingHorizontal: 20,
        paddingBottom: 120,
        gap: 16,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Konto</Text>

      {isAuthenticated && user ? (
        <View
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          testID="account-signed-in"
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {user.name}
          </Text>
          {user.email ? (
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
              {user.email}
            </Text>
          ) : null}
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
            {user.ownerType === "staff" ? "Mitarbeiter" : "Kunde"}
          </Text>
          <Pressable
            onPress={handleSignOut}
            disabled={logout.isPending}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: colors.secondary,
                opacity: logout.isPending ? 0.6 : pressed ? 0.8 : 1,
              },
            ]}
            testID="account-signout"
          >
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              Abmelden
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          testID="account-auth-form"
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
            <Feather name="user" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {mode === "login" ? "Anmelden" : "Konto erstellen"}
          </Text>
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
            {mode === "login"
              ? "Melde dich an, um Bestellungen zu verfolgen und schneller zu bestellen."
              : "Erstelle ein Konto, um deine Bestellungen zu speichern."}
          </Text>

          {mode === "register" ? (
            <TextInput
              style={inputStyle}
              placeholder="Vorname *"
              placeholderTextColor={colors.mutedForeground}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              testID="account-firstname"
            />
          ) : null}
          <TextInput
            style={inputStyle}
            placeholder="E-Mail *"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            testID="account-email"
          />
          <TextInput
            style={inputStyle}
            placeholder="Passwort *"
            placeholderTextColor={colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="account-password"
          />

          {formError ? (
            <Text
              style={[styles.errorText, { color: colors.destructive }]}
              testID="account-error"
            >
              {formError}
            </Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={isPending}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                opacity: isPending ? 0.6 : pressed ? 0.8 : 1,
              },
            ]}
            testID="account-submit"
          >
            {isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                {mode === "login" ? "Anmelden" : "Registrieren"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === "login" ? "register" : "login");
              setFormError(null);
            }}
            testID="account-toggle-mode"
          >
            <Text style={[styles.toggleText, { color: colors.primary }]}>
              {mode === "login"
                ? "Noch kein Konto? Jetzt registrieren"
                : "Schon ein Konto? Jetzt anmelden"}
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={() => router.push("/staff/login")}
        style={({ pressed }) => [
          styles.staffRow,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        testID="account-staff-link"
      >
        <Feather name="briefcase" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.staffTitle, { color: colors.foreground }]}>
            Mitarbeiter-Bereich
          </Text>
          <Text style={[styles.staffText, { color: colors.mutedForeground }]}>
            Login für das Team
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </Pressable>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>
        May Chicken &amp; Burger — App-Vorschau v0.2
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  card: {
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
  cardText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  toggleText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 16,
  },
  staffTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  staffText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  version: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});

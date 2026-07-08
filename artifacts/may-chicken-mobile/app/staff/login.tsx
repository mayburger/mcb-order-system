import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { useColors } from "@/hooks/useColors";

export default function StaffLoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [notice, setNotice] = useState<boolean>(false);

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      bottomOffset={40}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="briefcase" size={26} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Mitarbeiter-Login
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Zugang für Team-Mitglieder von May Chicken &amp; Burger
      </Text>

      <View style={styles.form}>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Benutzername"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          testID="staff-username"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Passwort"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          testID="staff-password"
        />
        <Pressable
          onPress={() => setNotice(true)}
          style={({ pressed }) => [
            styles.loginButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="staff-login-submit"
        >
          <Text style={[styles.loginText, { color: colors.primaryForeground }]}>
            Anmelden
          </Text>
        </Pressable>

        {notice ? (
          <View
            style={[styles.noticeBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            testID="staff-login-notice"
          >
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              Der Mitarbeiter-Login wird in einer späteren Phase aktiviert.
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push("/staff/dashboard")}
          style={({ pressed }) => [
            styles.previewLink,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          testID="staff-dashboard-preview"
        >
          <Text style={[styles.previewText, { color: colors.primary }]}>
            Dashboard-Vorschau ansehen
          </Text>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingTop: 32,
    alignItems: "center",
  },
  iconBox: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 28,
  },
  form: {
    width: "100%",
    maxWidth: 420,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  loginButton: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 4,
  },
  loginText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  previewLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  previewText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});

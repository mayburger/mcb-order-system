import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth-context";

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topInset + 16,
        paddingHorizontal: 20,
        paddingBottom: 120,
        gap: 16,
      }}
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
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
            {user.ownerType === "staff" ? "Mitarbeiter" : "Kunde"}
          </Text>
          <Pressable
            onPress={() => signOut()}
            style={({ pressed }) => [
              styles.secondaryButton,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 },
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
          testID="account-signed-out"
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
            <Feather name="user" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Kundenkonto
          </Text>
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
            Melde dich künftig an, um Bestellungen zu verfolgen und schneller zu
            bestellen. Der Kunden-Login wird in der nächsten Phase aktiviert.
          </Text>
          <View
            style={[styles.disabledButton, { backgroundColor: colors.muted }]}
            testID="account-login-placeholder"
          >
            <Feather name="lock" size={15} color={colors.mutedForeground} />
            <Text style={[styles.disabledButtonText, { color: colors.mutedForeground }]}>
              Anmelden — bald verfügbar
            </Text>
          </View>
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
        May Chicken &amp; Burger — App-Vorschau v0.1
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
  disabledButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  disabledButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
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

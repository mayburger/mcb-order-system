import { Feather } from "@expo/vector-icons";
import { useGetRestaurantInfo } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function StartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const {
    data: info,
    isLoading,
    isError,
    refetch,
  } = useGetRestaurantInfo();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topInset + 16,
        paddingBottom: 120,
        paddingHorizontal: 20,
      }}
    >
      <View style={styles.brandRow}>
        <Text style={[styles.brandTop, { color: colors.foreground }]}>
          MAY CHICKEN
        </Text>
        <Text style={[styles.brandBottom, { color: colors.primary }]}>
          & BURGER
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerBox} testID="home-loading">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          testID="home-error"
        >
          <Feather name="wifi-off" size={22} color={colors.mutedForeground} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Verbindung fehlgeschlagen
          </Text>
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
            Die Restaurant-Daten konnten nicht geladen werden.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            testID="home-retry"
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
              Erneut versuchen
            </Text>
          </Pressable>
        </View>
      ) : info ? (
        <View
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          testID="home-info"
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {info.name}
          </Text>
          {info.tagline ? (
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
              {info.tagline}
            </Text>
          ) : null}
          <View style={styles.badgeRow}>
            {info.pickupEnabled ? (
              <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                <Feather name="shopping-bag" size={13} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.foreground }]}>
                  Abholung {info.estimatedPickupTime ? `~${info.estimatedPickupTime} Min` : ""}
                </Text>
              </View>
            ) : null}
            {info.deliveryEnabled ? (
              <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                <Feather name="truck" size={13} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.foreground }]}>
                  Lieferung {info.estimatedDeliveryTime ? `~${info.estimatedDeliveryTime} Min` : ""}
                </Text>
              </View>
            ) : null}
          </View>
          {info.address ? (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                {info.address}
              </Text>
            </View>
          ) : null}
          {info.phone ? (
            <View style={styles.infoRow}>
              <Feather name="phone" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                {info.phone}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push("/(tabs)/menu")}
        style={({ pressed }) => [
          styles.ctaButton,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
        testID="home-cta-menu"
      >
        <Feather name="book-open" size={18} color={colors.primaryForeground} />
        <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
          Speisekarte ansehen
        </Text>
      </Pressable>

      <View
        style={[styles.noticeBox, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
          Vorschau-Version — Bestellen &amp; Konto folgen in der nächsten Phase.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    marginBottom: 24,
  },
  brandTop: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    letterSpacing: -1,
  },
  brandBottom: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    letterSpacing: -1,
    marginTop: -6,
  },
  centerBox: {
    paddingVertical: 48,
    alignItems: "center",
  },
  card: {
    borderWidth: 1,
    padding: 18,
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
  },
  cardText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  retryButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    marginBottom: 16,
  },
  ctaText: {
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
    fontSize: 12,
    lineHeight: 17,
  },
});

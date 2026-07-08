import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type ModuleCard = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
};

const MODULES: ModuleCard[] = [
  {
    icon: "shopping-bag",
    title: "Bestellungen",
    description: "Eingehende Bestellungen ansehen und verwalten",
  },
  {
    icon: "monitor",
    title: "Küche",
    description: "Küchen-Display mit offenen Bestellungen",
  },
  {
    icon: "dollar-sign",
    title: "Kasse",
    description: "Tagesübersicht, Bewegungen und Abschluss",
  },
  {
    icon: "truck",
    title: "Fahrer",
    description: "Lieferungen annehmen und abschließen",
  },
];

export default function StaffDashboardScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Vorschau — die Module werden in späteren Phasen freigeschaltet.
      </Text>

      <View style={styles.grid}>
        {MODULES.map((mod) => (
          <View
            key={mod.title}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            testID={`staff-module-${mod.title}`}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
              <Feather name={mod.icon} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {mod.title}
            </Text>
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
              {mod.description}
            </Text>
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                Bald verfügbar
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  cardText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  badgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
});

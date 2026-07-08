import { Feather } from "@expo/vector-icons";
import { useListMenuCategories } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function MenuScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const {
    data: categories,
    isLoading,
    isError,
    refetch,
  } = useListMenuCategories();

  const visibleCategories = (categories ?? []).filter((c) => c.visible);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Speisekarte
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Vorschau — Bestellen folgt in der nächsten Phase
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerBox} testID="menu-loading">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centerBox} testID="menu-error">
          <Feather name="wifi-off" size={28} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Speisekarte konnte nicht geladen werden.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            testID="menu-retry"
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
              Erneut versuchen
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visibleCategories}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={visibleCategories.length > 0}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 120,
            gap: 10,
          }}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Feather name="book-open" size={28} color={colors.mutedForeground} />
              <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                Noch keine Kategorien vorhanden.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.categoryCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              testID={`menu-category-${item.id}`}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.categoryName, { color: colors.foreground }]}>
                  {item.name}
                </Text>
                {item.description ? (
                  <Text
                    style={[styles.categoryDesc, { color: colors.mutedForeground }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
              {typeof item.itemCount === "number" ? (
                <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.countText, { color: colors.primary }]}>
                    {item.itemCount}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  centerBox: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 16,
  },
  categoryName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  categoryDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});

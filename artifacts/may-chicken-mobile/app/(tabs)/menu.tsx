import { Feather } from "@expo/vector-icons";
import {
  useListMenuCategories,
  useListMenuItems,
  type MenuItem,
} from "@workspace/api-client-react";
import React, { useMemo, useState } from "react";
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
import { formatEuro, useCart } from "@/lib/cart-context";

export default function MenuScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { addItem, itemCount } = useCart();

  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useListMenuCategories();
  const {
    data: items,
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useListMenuItems();

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const isLoading = categoriesLoading || itemsLoading;
  const isError = categoriesError || itemsError;

  const visibleCategories = useMemo(
    // Der öffentliche Endpoint liefert bereits nur sichtbare Kategorien und
    // serialisiert `visible` nicht — nur explizit ausgeblendete rausfiltern.
    () => (categories ?? []).filter((c) => c.visible !== false),
    [categories],
  );

  const itemsByCategory = useMemo(() => {
    const map = new Map<number, MenuItem[]>();
    for (const item of items ?? []) {
      if (!item.available) continue;
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    return map;
  }, [items]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Speisekarte
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {itemCount > 0
            ? `${itemCount} Artikel im Warenkorb`
            : "Tippe auf eine Kategorie und lege Artikel in den Warenkorb"}
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
            onPress={() => {
              refetchCategories();
              refetchItems();
            }}
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
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 120,
            gap: 10,
          }}
        >
          {visibleCategories.length === 0 ? (
            <View style={styles.centerBox}>
              <Feather name="book-open" size={28} color={colors.mutedForeground} />
              <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                Noch keine Kategorien vorhanden.
              </Text>
            </View>
          ) : (
            visibleCategories.map((cat) => {
              const catItems = itemsByCategory.get(cat.id) ?? [];
              const expanded = expandedId === cat.id;
              return (
                <View key={cat.id}>
                  <Pressable
                    onPress={() => setExpandedId(expanded ? null : cat.id)}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: expanded ? colors.primary : colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    testID={`menu-category-${cat.id}`}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.categoryName, { color: colors.foreground }]}>
                        {cat.name}
                      </Text>
                      {cat.description ? (
                        <Text
                          style={[styles.categoryDesc, { color: colors.mutedForeground }]}
                          numberOfLines={2}
                        >
                          {cat.description}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.countText, { color: colors.primary }]}>
                        {catItems.length}
                      </Text>
                    </View>
                    <Feather
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </Pressable>

                  {expanded ? (
                    <View style={{ gap: 8, marginTop: 8 }}>
                      {catItems.length === 0 ? (
                        <Text
                          style={[styles.errorText, { color: colors.mutedForeground }]}
                        >
                          Keine Artikel in dieser Kategorie.
                        </Text>
                      ) : (
                        catItems.map((item) => (
                          <View
                            key={item.id}
                            style={[
                              styles.itemRow,
                              { backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                            testID={`menu-item-${item.id}`}
                          >
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text
                                style={[styles.itemName, { color: colors.foreground }]}
                              >
                                {item.name}
                              </Text>
                              {item.description ? (
                                <Text
                                  style={[
                                    styles.categoryDesc,
                                    { color: colors.mutedForeground },
                                  ]}
                                  numberOfLines={2}
                                >
                                  {item.description}
                                </Text>
                              ) : null}
                              <Text style={[styles.itemPrice, { color: colors.primary }]}>
                                {formatEuro(item.price)}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() =>
                                addItem({
                                  menuItemId: item.id,
                                  name: item.name,
                                  price: item.price,
                                })
                              }
                              style={({ pressed }) => [
                                styles.addButton,
                                {
                                  backgroundColor: colors.primary,
                                  opacity: pressed ? 0.8 : 1,
                                },
                              ]}
                              testID={`menu-add-${item.id}`}
                            >
                              <Feather
                                name="plus"
                                size={18}
                                color={colors.primaryForeground}
                              />
                            </Pressable>
                          </View>
                        ))
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
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
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 14,
    marginLeft: 12,
  },
  itemName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  itemPrice: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
});

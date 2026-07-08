import { Feather } from "@expo/vector-icons";
import {
  useGetMenuItem,
  type OptionGroup,
  type OptionGroupItem,
} from "@workspace/api-client-react";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
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
import {
  computeUnitPrice,
  formatEuro,
  useCart,
  type SelectedOption,
} from "@/lib/cart-context";

export default function ItemDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const { addItem } = useCart();

  const {
    data: item,
    isLoading,
    isError,
    refetch,
  } = useGetMenuItem(itemId);

  const optionGroups: OptionGroup[] = useMemo(
    () =>
      (item?.optionGroups ?? [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [item],
  );

  // Auswahl je Gruppe; bei "single"-Gruppen wird die erste Option vorbelegt,
  // sobald die Daten da sind.
  const [selections, setSelections] = useState<Map<number, number[]>>(
    new Map(),
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const effectiveSelections = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const group of optionGroups) {
      const chosen = selections.get(group.id);
      if (chosen !== undefined) {
        map.set(group.id, chosen);
      } else if (group.inputType === "single" && group.items.length > 0) {
        map.set(group.id, [group.items[0].id]);
      } else {
        map.set(group.id, []);
      }
    }
    return map;
  }, [optionGroups, selections]);

  const toggleOption = (group: OptionGroup, optItem: OptionGroupItem) => {
    setSelections(() => {
      const next = new Map(effectiveSelections);
      const current = next.get(group.id) ?? [];
      if (group.inputType === "single") {
        next.set(group.id, [optItem.id]);
      } else if (current.includes(optItem.id)) {
        next.set(
          group.id,
          current.filter((oid) => oid !== optItem.id),
        );
      } else {
        next.set(group.id, [...current, optItem.id]);
      }
      return next;
    });
  };

  // Größenabhängiger Preis: additive Optionen können je gewählter
  // "absolute"-Option (z. B. Pizza-Größe) unterschiedlich kosten.
  const selectedSizeItem = useMemo(() => {
    const sizeGroup = optionGroups.find((g) => g.priceType === "absolute");
    if (!sizeGroup) return undefined;
    const sizeIds = effectiveSelections.get(sizeGroup.id) ?? [];
    return sizeGroup.items.find((i) => i.id === sizeIds[0]);
  }, [optionGroups, effectiveSelections]);

  const optionPrice = (group: OptionGroup, optItem: OptionGroupItem) => {
    if (
      group.priceType === "additive" &&
      optItem.priceByVariant &&
      selectedSizeItem &&
      optItem.priceByVariant[selectedSizeItem.name] !== undefined
    ) {
      return optItem.priceByVariant[selectedSizeItem.name];
    }
    return optItem.defaultPrice;
  };

  const selectedOptions = useMemo<SelectedOption[]>(() => {
    const result: SelectedOption[] = [];
    for (const group of optionGroups) {
      const selectedIds = effectiveSelections.get(group.id) ?? [];
      for (const oid of selectedIds) {
        const optItem = group.items.find((i) => i.id === oid);
        if (!optItem) continue;
        result.push({
          groupId: group.id,
          groupName: group.name,
          optionItemId: optItem.id,
          optionItemName: optItem.name,
          price: optionPrice(group, optItem),
          inputType: group.inputType as "single" | "multiple",
          priceType: group.priceType as "absolute" | "additive",
        });
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionGroups, effectiveSelections, selectedSizeItem]);

  const requiredMissing = optionGroups
    .filter((g) => g.required)
    .some((g) => (effectiveSelections.get(g.id) ?? []).length === 0);

  const unitPrice = item ? computeUnitPrice(item.price, selectedOptions) : 0;

  const handleAdd = () => {
    if (!item || requiredMissing) return;
    addItem(
      { id: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl },
      quantity,
      selectedOptions,
    );
    setAdded(true);
    setTimeout(() => {
      if (router.canGoBack()) router.back();
    }, 600);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: item?.name ?? "Produkt" }} />

      {isLoading ? (
        <View style={styles.centerBox} testID="item-loading">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError || !item ? (
        <View style={styles.centerBox} testID="item-error">
          <Feather name="alert-circle" size={28} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Produkt konnte nicht geladen werden.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            testID="item-retry"
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
              Erneut versuchen
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            testID="item-detail"
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.image}
                contentFit="cover"
                transition={150}
              />
            ) : null}

            <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 6 }}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {item.name}
              </Text>
              {item.description ? (
                <Text style={[styles.description, { color: colors.mutedForeground }]}>
                  {item.description}
                </Text>
              ) : null}
              <Text style={[styles.basePrice, { color: colors.primary }]}>
                {optionGroups.some((g) => g.priceType === "absolute")
                  ? `ab ${formatEuro(item.price)}`
                  : formatEuro(item.price)}
              </Text>
            </View>

            {optionGroups.map((group) => {
              const selectedIds = effectiveSelections.get(group.id) ?? [];
              const isMultiple = group.inputType === "multiple";
              return (
                <View key={group.id} style={{ paddingHorizontal: 20, marginTop: 20 }}>
                  <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>
                    {group.name.toUpperCase()}
                    {group.required ? (
                      <Text style={{ color: colors.primary }}> *</Text>
                    ) : (
                      <Text style={{ color: colors.mutedForeground }}>
                        {"  "}(optional)
                      </Text>
                    )}
                  </Text>
                  <View style={{ gap: 6 }}>
                    {group.items
                      .filter((o) => o.available !== false)
                      .map((optItem) => {
                        const selected = selectedIds.includes(optItem.id);
                        const price = optionPrice(group, optItem);
                        return (
                          <Pressable
                            key={optItem.id}
                            onPress={() => toggleOption(group, optItem)}
                            style={({ pressed }) => [
                              styles.optionRow,
                              {
                                backgroundColor: selected
                                  ? colors.secondary
                                  : colors.card,
                                borderColor: selected
                                  ? colors.primary
                                  : colors.border,
                                opacity: pressed ? 0.85 : 1,
                              },
                            ]}
                            testID={`option-${optItem.id}`}
                          >
                            <View
                              style={[
                                isMultiple ? styles.checkbox : styles.radio,
                                {
                                  borderColor: selected
                                    ? colors.primary
                                    : colors.mutedForeground,
                                  backgroundColor:
                                    selected && isMultiple
                                      ? colors.primary
                                      : "transparent",
                                },
                              ]}
                            >
                              {selected ? (
                                isMultiple ? (
                                  <Feather
                                    name="check"
                                    size={12}
                                    color={colors.primaryForeground}
                                  />
                                ) : (
                                  <View
                                    style={[
                                      styles.radioDot,
                                      { backgroundColor: colors.primary },
                                    ]}
                                  />
                                )
                              ) : null}
                            </View>
                            <Text
                              style={[
                                styles.optionName,
                                { color: colors.foreground },
                              ]}
                              numberOfLines={1}
                            >
                              {optItem.name}
                            </Text>
                            <Text style={[styles.optionPrice, { color: colors.primary }]}>
                              {group.priceType === "absolute"
                                ? formatEuro(price)
                                : price > 0
                                  ? `+${formatEuro(price)}`
                                  : ""}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
                paddingBottom:
                  Platform.OS === "web" ? 16 : Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={[styles.qtyBox, { borderColor: colors.border }]}>
              <Pressable
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                style={styles.qtyButton}
                testID="item-qty-dec"
              >
                <Feather name="minus" size={18} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.qtyText, { color: colors.foreground }]} testID="item-qty">
                {quantity}
              </Text>
              <Pressable
                onPress={() => setQuantity((q) => q + 1)}
                style={styles.qtyButton}
                testID="item-qty-inc"
              >
                <Feather name="plus" size={18} color={colors.foreground} />
              </Pressable>
            </View>
            <Pressable
              onPress={handleAdd}
              disabled={requiredMissing || added}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: colors.primary,
                  opacity: requiredMissing ? 0.5 : pressed || added ? 0.8 : 1,
                },
              ]}
              testID="item-add"
            >
              {added ? (
                <Feather name="check" size={18} color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.addText, { color: colors.primaryForeground }]}>
                  Hinzufügen — {formatEuro(unitPrice * quantity)}
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -0.5,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  basePrice: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginTop: 2,
  },
  groupTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionName: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  optionPrice: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  qtyButton: {
    width: 42,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    minWidth: 24,
    textAlign: "center",
  },
  addButton: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});

import { Feather } from "@expo/vector-icons";
import { useCreateOrder, type Order } from "@workspace/api-client-react";
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
import {
  cartLineDisplayName,
  cartLineExtras,
  formatEuro,
  useCart,
} from "@/lib/cart-context";

type OrderType = "pickup" | "delivery";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { items, total, incrementLine, decrementLine, removeLine, clearCart } =
    useCart();
  const { user } = useAuth();

  const [orderType, setOrderType] = useState<OrderType>("pickup");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const createOrder = useCreateOrder();

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      color: colors.foreground,
    },
  ];

  const submit = () => {
    setFormError(null);
    if (items.length === 0) return;
    if (!name.trim()) {
      setFormError("Bitte gib deinen Namen an.");
      return;
    }
    if (!phone.trim()) {
      setFormError("Bitte gib deine Telefonnummer an.");
      return;
    }
    if (orderType === "delivery" && (!address.trim() || !postalCode.trim() || !city.trim())) {
      setFormError("Für die Lieferung brauchen wir Adresse, PLZ und Ort.");
      return;
    }

    createOrder.mutate(
      {
        data: {
          orderType,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: user?.email ?? null,
          ...(orderType === "delivery"
            ? {
                deliveryAddress: address.trim(),
                postalCode: postalCode.trim(),
                city: city.trim(),
              }
            : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          paymentMethod: "cash",
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            ...(i.selectedOptions.length > 0
              ? {
                  selectedOptions: i.selectedOptions.map((o) => ({
                    groupId: o.groupId,
                    optionItemId: o.optionItemId,
                    price: o.price,
                  })),
                }
              : {}),
          })),
        },
      },
      {
        onSuccess: (order) => {
          setPlacedOrder(order);
          clearCart();
          setNotes("");
        },
        onError: (err) => {
          const message =
            err instanceof Error && err.message
              ? err.message
              : "Bestellung fehlgeschlagen. Bitte versuche es erneut.";
          setFormError(message);
        },
      },
    );
  };

  if (placedOrder) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.emptyBox} testID="cart-success">
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.card, borderColor: colors.primary },
            ]}
          >
            <Feather name="check" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Bestellung eingegangen!
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Bestellnummer {placedOrder.orderNumber}. Wir legen gleich los —
            Bezahlung bar bei {placedOrder.orderType === "delivery" ? "Lieferung" : "Abholung"}.
          </Text>
          <Pressable
            onPress={() => setPlacedOrder(null)}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            testID="cart-new-order"
          >
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
              Neue Bestellung
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 140 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Warenkorb
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyBox} testID="cart-empty">
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="shopping-cart" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Dein Warenkorb ist leer
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Füge Artikel aus der Speisekarte hinzu, um zu bestellen.
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {items.map((line) => {
            const extras = cartLineExtras(line);
            return (
              <View
                key={line.cartKey}
                style={[
                  styles.cartRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                testID={`cart-item-${line.menuItemId}`}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>
                    {cartLineDisplayName(line)}
                  </Text>
                  {extras ? (
                    <Text
                      style={[styles.itemPrice, { color: colors.mutedForeground }]}
                      numberOfLines={2}
                    >
                      {extras}
                    </Text>
                  ) : null}
                  <Text style={[styles.itemPrice, { color: colors.mutedForeground }]}>
                    {formatEuro(line.unitPrice)} · Summe{" "}
                    {formatEuro(line.unitPrice * line.quantity)}
                  </Text>
                </View>
                <View style={styles.qtyBox}>
                  <Pressable
                    onPress={() => decrementLine(line.cartKey)}
                    style={[styles.qtyButton, { backgroundColor: colors.secondary }]}
                    testID={`cart-dec-${line.menuItemId}`}
                  >
                    <Feather name="minus" size={16} color={colors.foreground} />
                  </Pressable>
                  <Text style={[styles.qtyText, { color: colors.foreground }]}>
                    {line.quantity}
                  </Text>
                  <Pressable
                    onPress={() => incrementLine(line.cartKey)}
                    style={[styles.qtyButton, { backgroundColor: colors.secondary }]}
                    testID={`cart-inc-${line.menuItemId}`}
                  >
                    <Feather name="plus" size={16} color={colors.foreground} />
                  </Pressable>
                  <Pressable
                    onPress={() => removeLine(line.cartKey)}
                    style={styles.removeButton}
                    testID={`cart-remove-${line.menuItemId}`}
                  >
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              </View>
            );
          })}

          <View
            style={[
              styles.totalRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>
              Zwischensumme
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]} testID="cart-total">
              {formatEuro(total)}
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Bestelldaten
          </Text>

          <View style={styles.toggleRow}>
            {(["pickup", "delivery"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setOrderType(t)}
                style={[
                  styles.toggleButton,
                  {
                    backgroundColor: orderType === t ? colors.primary : colors.card,
                    borderColor: orderType === t ? colors.primary : colors.border,
                  },
                ]}
                testID={`cart-type-${t}`}
              >
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color:
                        orderType === t ? colors.primaryForeground : colors.foreground,
                    },
                  ]}
                >
                  {t === "pickup" ? "Abholung" : "Lieferung"}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={inputStyle}
            placeholder="Name *"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            testID="cart-name"
          />
          <TextInput
            style={inputStyle}
            placeholder="Telefon *"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            testID="cart-phone"
          />
          {orderType === "delivery" ? (
            <>
              <TextInput
                style={inputStyle}
                placeholder="Straße und Hausnummer *"
                placeholderTextColor={colors.mutedForeground}
                value={address}
                onChangeText={setAddress}
                testID="cart-address"
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput
                  style={[...inputStyle, { flex: 1 }]}
                  placeholder="PLZ *"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  value={postalCode}
                  onChangeText={setPostalCode}
                  testID="cart-postal"
                />
                <TextInput
                  style={[...inputStyle, { flex: 2 }]}
                  placeholder="Ort *"
                  placeholderTextColor={colors.mutedForeground}
                  value={city}
                  onChangeText={setCity}
                  testID="cart-city"
                />
              </View>
            </>
          ) : null}
          <TextInput
            style={[...inputStyle, { minHeight: 70, textAlignVertical: "top" }]}
            placeholder="Anmerkungen (optional)"
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={notes}
            onChangeText={setNotes}
            testID="cart-notes"
          />

          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Bezahlung: bar bei {orderType === "delivery" ? "Lieferung" : "Abholung"}
          </Text>

          {formError ? (
            <Text style={[styles.error, { color: colors.destructive }]} testID="cart-error">
              {formError}
            </Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={createOrder.isPending}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                opacity: createOrder.isPending ? 0.6 : pressed ? 0.8 : 1,
              },
            ]}
            testID="cart-submit"
          >
            {createOrder.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                Jetzt bestellen — {formatEuro(total)}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  iconCircle: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 14,
  },
  itemName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  itemPrice: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    minWidth: 20,
    textAlign: "center",
  },
  removeButton: {
    marginLeft: 4,
    padding: 4,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    padding: 14,
  },
  totalLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  totalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    marginTop: 12,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
  },
  toggleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  error: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 4,
  },
  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});

import React, { createContext, useContext, useEffect, useState } from "react";
import { MenuItem } from "@workspace/api-client-react";

export interface SelectedOption {
  groupId: number;
  groupName: string;
  optionItemId: number;
  optionItemName: string;
  price: number;
  inputType: "single" | "multiple";
  priceType: "absolute" | "additive";
}

export interface CartItem {
  cartKey: string;
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: SelectedOption[];
  unitPrice: number;
}

export interface CartSnapshot {
  menuItemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  selectedOptions: Array<{
    groupId: number;
    groupName: string;
    optionItemId: number;
    optionItemName: string;
    price: number;
    priceType: string;
  }>;
}

interface CartContextType {
  items: CartItem[];
  addItem: (menuItem: MenuItem, quantity?: number, selectedOptions?: SelectedOption[]) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  setCartFromSnapshot: (snapItems: CartSnapshot[]) => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function buildCartKey(menuItemId: number, selectedOptions: Pick<SelectedOption, "groupId" | "optionItemId">[]) {
  const optsKey = selectedOptions
    .map((o) => `${o.groupId}:${o.optionItemId}`)
    .sort()
    .join("|");
  return `${menuItemId}-${optsKey}`;
}

export function computeUnitPrice(item: MenuItem, selectedOptions: SelectedOption[]): number {
  const absoluteOpt = selectedOptions.find((o) => o.priceType === "absolute");
  const base = absoluteOpt ? absoluteOpt.price : item.price;
  const additivesTotal = selectedOptions
    .filter((o) => o.priceType === "additive")
    .reduce((s, o) => s + o.price, 0);
  return base + additivesTotal;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("may_chicken_cart_v3");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("may_chicken_cart_v3", JSON.stringify(items));
  }, [items]);

  const addItem = (menuItem: MenuItem, quantity = 1, selectedOptions: SelectedOption[] = []) => {
    const cartKey = buildCartKey(menuItem.id, selectedOptions);
    const unitPrice = computeUnitPrice(menuItem, selectedOptions);
    setItems((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.cartKey === cartKey ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { cartKey, menuItem, quantity, selectedOptions, unitPrice }];
    });
  };

  const removeItem = (cartKey: string) => {
    setItems((prev) => prev.filter((i) => i.cartKey !== cartKey));
  };

  const updateQuantity = (cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartKey);
      return;
    }
    setItems((prev) => prev.map((i) => (i.cartKey === cartKey ? { ...i, quantity } : i)));
  };

  const clearCart = () => setItems([]);

  // Rebuild cart from a snapshot (used by "Erneut bestellen" and Favorites)
  const setCartFromSnapshot = (snapItems: CartSnapshot[]) => {
    const newItems: CartItem[] = snapItems
      .filter((s) => s.menuItemId > 0)
      .map((snap) => {
        const selectedOptions: SelectedOption[] = snap.selectedOptions.map((o) => ({
          groupId: o.groupId,
          groupName: o.groupName,
          optionItemId: o.optionItemId,
          optionItemName: o.optionItemName,
          price: o.price,
          inputType: "single" as const,
          priceType: (o.priceType === "absolute" ? "absolute" : "additive") as "absolute" | "additive",
        }));
        const cartKey = buildCartKey(snap.menuItemId, selectedOptions);
        // Create a minimal MenuItem stub — only id/name/price are used in practice
        const menuItem = {
          id: snap.menuItemId,
          name: snap.itemName,
          price: snap.unitPrice,
          categoryId: 0,
          available: true,
          featured: false,
          sortOrder: 0,
          createdAt: new Date().toISOString(),
        } as unknown as MenuItem;
        return {
          cartKey,
          menuItem,
          quantity: snap.quantity,
          selectedOptions,
          unitPrice: snap.unitPrice,
        };
      });
    setItems(newItems);
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, setCartFromSnapshot, totalItems, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

export function getCartItemDisplayName(item: CartItem): string {
  const absoluteOpt = item.selectedOptions.find((o) => o.priceType === "absolute");
  if (absoluteOpt) return `${item.menuItem.name} (${absoluteOpt.optionItemName})`;
  return item.menuItem.name;
}

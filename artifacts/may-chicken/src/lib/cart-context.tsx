import React, { createContext, useContext, useEffect, useState } from "react";
import { MenuItem, ItemVariant, ItemExtra } from "@workspace/api-client-react";

export interface SelectedExtra {
  name: string;
  price: number;
}

export interface CartItem {
  cartKey: string; // unique key: menuItemId + variantId + extraIds
  menuItem: MenuItem;
  quantity: number;
  variant?: ItemVariant;
  selectedExtras: SelectedExtra[];
  unitPrice: number; // base + extras
}

interface CartContextType {
  items: CartItem[];
  addItem: (menuItem: MenuItem, quantity?: number, variant?: ItemVariant, selectedExtras?: SelectedExtra[]) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function buildCartKey(menuItemId: number, variantId?: number, extras?: SelectedExtra[]) {
  const extraKey = (extras ?? []).map((e) => e.name).sort().join("|");
  return `${menuItemId}-${variantId ?? "none"}-${extraKey}`;
}

function computeUnitPrice(item: MenuItem, variant?: ItemVariant, extras?: SelectedExtra[]) {
  const base = variant ? variant.price : item.price;
  const extrasTotal = (extras ?? []).reduce((s, e) => s + e.price, 0);
  return base + extrasTotal;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("may_chicken_cart_v2");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("may_chicken_cart_v2", JSON.stringify(items));
  }, [items]);

  const addItem = (menuItem: MenuItem, quantity = 1, variant?: ItemVariant, selectedExtras: SelectedExtra[] = []) => {
    const cartKey = buildCartKey(menuItem.id, variant?.id, selectedExtras);
    const unitPrice = computeUnitPrice(menuItem, variant, selectedExtras);
    setItems((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.cartKey === cartKey ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { cartKey, menuItem, quantity, variant, selectedExtras, unitPrice }];
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
    setItems((prev) => prev.map((i) => i.cartKey === cartKey ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}
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

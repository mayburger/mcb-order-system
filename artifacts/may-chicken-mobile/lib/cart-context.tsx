import type { MenuItem } from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export interface SelectedOption {
  groupId: number;
  groupName: string;
  optionItemId: number;
  optionItemName: string;
  price: number;
  inputType: "single" | "multiple";
  priceType: "absolute" | "additive";
}

export interface CartLine {
  cartKey: string;
  menuItemId: number;
  name: string;
  imageUrl?: string | null;
  quantity: number;
  selectedOptions: SelectedOption[];
  unitPrice: number;
}

interface CartContextValue {
  items: CartLine[];
  itemCount: number;
  total: number;
  addItem: (
    item: Pick<MenuItem, "id" | "name" | "price"> & {
      imageUrl?: string | null;
    },
    quantity?: number,
    selectedOptions?: SelectedOption[],
  ) => void;
  incrementLine: (cartKey: string) => void;
  decrementLine: (cartKey: string) => void;
  removeLine: (cartKey: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function buildCartKey(
  menuItemId: number,
  selectedOptions: Pick<SelectedOption, "groupId" | "optionItemId">[],
): string {
  const optsKey = selectedOptions
    .map((o) => `${o.groupId}:${o.optionItemId}`)
    .sort()
    .join("|");
  return `${menuItemId}-${optsKey}`;
}

/**
 * Gleiche Preislogik wie im Web-Frontend: eine "absolute" Option (z. B.
 * Pizza-Größe) ersetzt den Basispreis, "additive" Optionen (Extras) werden
 * aufaddiert.
 */
export function computeUnitPrice(
  basePrice: number,
  selectedOptions: SelectedOption[],
): number {
  const absoluteOpt = selectedOptions.find((o) => o.priceType === "absolute");
  const base = absoluteOpt ? absoluteOpt.price : basePrice;
  const additivesTotal = selectedOptions
    .filter((o) => o.priceType === "additive")
    .reduce((sum, o) => sum + o.price, 0);
  return base + additivesTotal;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);

  const addItem = useCallback(
    (
      item: Pick<MenuItem, "id" | "name" | "price"> & {
        imageUrl?: string | null;
      },
      quantity = 1,
      selectedOptions: SelectedOption[] = [],
    ) => {
      const cartKey = buildCartKey(item.id, selectedOptions);
      const unitPrice = computeUnitPrice(item.price, selectedOptions);
      setItems((prev) => {
        const existing = prev.find((l) => l.cartKey === cartKey);
        if (existing) {
          return prev.map((l) =>
            l.cartKey === cartKey
              ? { ...l, quantity: l.quantity + quantity }
              : l,
          );
        }
        return [
          ...prev,
          {
            cartKey,
            menuItemId: item.id,
            name: item.name,
            imageUrl: item.imageUrl,
            quantity,
            selectedOptions,
            unitPrice,
          },
        ];
      });
    },
    [],
  );

  const incrementLine = useCallback((cartKey: string) => {
    setItems((prev) =>
      prev.map((l) =>
        l.cartKey === cartKey ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    );
  }, []);

  const decrementLine = useCallback((cartKey: string) => {
    setItems((prev) =>
      prev
        .map((l) =>
          l.cartKey === cartKey ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const removeLine = useCallback((cartKey: string) => {
    setItems((prev) => prev.filter((l) => l.cartKey !== cartKey));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, l) => sum + l.quantity, 0);
    const total = items.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    return {
      items,
      itemCount,
      total,
      addItem,
      incrementLine,
      decrementLine,
      removeLine,
      clearCart,
    };
  }, [items, addItem, incrementLine, decrementLine, removeLine, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}

/** Anzeigename inkl. Größe, z. B. "Pizza Salami (32 cm)". */
export function cartLineDisplayName(line: CartLine): string {
  const absoluteOpt = line.selectedOptions.find(
    (o) => o.priceType === "absolute",
  );
  if (absoluteOpt) return `${line.name} (${absoluteOpt.optionItemName})`;
  return line.name;
}

/** Extras (additive Optionen) als kommagetrennte Liste. */
export function cartLineExtras(line: CartLine): string {
  return line.selectedOptions
    .filter((o) => o.priceType === "additive")
    .map((o) => `+ ${o.optionItemName}`)
    .join(", ");
}

export function formatEuro(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

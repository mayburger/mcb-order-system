import type { Order } from "@workspace/api-client-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PrintSettings {
  restaurantName: string;
  address: string;
  phone: string;
  email?: string;
}

export type BonType = "kitchen" | "customer" | "driver";

// ── Constants ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: PrintSettings = {
  restaurantName: "May Chicken & Burger",
  address: "",
  phone: "",
  email: "",
};

export const SOURCE_LABELS: Record<string, string> = {
  online: "Online-Bestellung",
  phone: "Telefonbestellung",
  lieferando: "Lieferando-Bestellung",
  takeaway: "Mitnehmen / Abholung",
  dine_in: "Tischbestellung",
};

export const PAY_LABELS: Record<string, string> = {
  cash: "Bar",
  ec: "EC-Karte",
  paypal: "PayPal",
  card: "Karte",
  lieferando: "Lieferando bezahlt",
};

type OptSnap = {
  optionItemName: string;
  price: number;
  priceType?: string;
};

// ── Shared CSS for 80mm thermal ───────────────────────────────────────────────

const THERMAL_CSS = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.45;
    width: 80mm;
    margin: 0;
    padding: 3mm 4mm;
    color: #000;
    background: #fff;
  }
  h1 { font-size: 15px; font-weight: bold; text-align: center; margin: 0 0 2px; letter-spacing: 0.5px; }
  h2 { font-size: 13px; font-weight: bold; text-align: center; margin: 0 0 6px; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .big { font-size: 14px; font-weight: bold; }
  .xl { font-size: 18px; font-weight: bold; }
  hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  hr.solid { border-top: 1px solid #000; }
  hr.double { border-top: 3px double #000; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; }
  .row .label { flex: 1; }
  .row .val { text-align: right; white-space: nowrap; }
  .item-name { font-size: 12px; font-weight: bold; }
  .item-detail { padding-left: 10px; color: #333; }
  .item-extra { padding-left: 14px; color: #555; }
  .note-box { border: 1px solid #000; padding: 3px 5px; margin: 4px 0; }
  .note-label { font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .spacer { height: 4px; }
  .invert { background: #000; color: #fff; padding: 2px 5px; text-align: center; }
`;

// ── Helper ────────────────────────────────────────────────────────────────────

function fmt(n: number | string | null | undefined) {
  return Number(n ?? 0).toFixed(2) + " \u20AC";
}

function fmtTime(dateStr: string | Date) {
  return new Date(dateStr).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function openPrintWindow(title: string, body: string) {
  const win = window.open("", "_blank", "width=380,height=700,toolbar=0,scrollbars=1");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${THERMAL_CSS}</style>
</head>
<body>
${body}
<script>
  window.onload = function() {
    window.print();
    setTimeout(function() { window.close(); }, 800);
  };
<\/script>
</body></html>`);
  win.document.close();
}

// ── Küchenbon ─────────────────────────────────────────────────────────────────

export function buildKitchenHtml(order: Order): string {
  const src = SOURCE_LABELS[order.source ?? ""] ?? (order.source ?? "Bestellung");
  const orderTypeLabel =
    order.orderType === "delivery"
      ? "🚚 LIEFERUNG"
      : order.source === "dine_in"
      ? `🪑 TISCH: ${order.tableInfo ?? "-"}`
      : "🛍️ ABHOLUNG";

  const itemsHtml = order.items
    .map((item) => {
      const opts = (item.optionsSnapshot ?? []) as OptSnap[];
      const variant = item.variantName ?? opts.find((o) => o.priceType === "absolute")?.optionItemName ?? null;
      const extras = opts.filter((o) => o.priceType !== "absolute");
      return `
        <div style="margin: 6px 0;">
          <div class="row">
            <span class="item-name">×${item.quantity}  ${item.itemName}</span>
          </div>
          ${variant ? `<div class="item-detail">→ ${variant}</div>` : ""}
          ${extras.map((e) => `<div class="item-extra">+ ${e.optionItemName}</div>`).join("")}
        </div>`;
    })
    .join('<hr style="border-top:1px dotted #ccc; margin:3px 0">');

  const hasAllergyNote = order.notes &&
    /allergi|glutenfrei|laktose|vegan|vegetar|nuss|erdnuss|sesam/i.test(order.notes);

  return `
    <div class="invert bold">&nbsp;KÜCHENBON&nbsp;</div>
    <div class="spacer"></div>

    <div class="center">
      <div class="xl">${order.orderNumber}</div>
      <div>${fmtTime(order.createdAt as unknown as string)}</div>
    </div>
    <div class="spacer"></div>

    <div class="center big">${orderTypeLabel}</div>
    <div class="center">${src}</div>
    <hr>

    ${itemsHtml}
    <hr>

    ${order.notes ? `
    <div class="note-box">
      <div class="note-label">${hasAllergyNote ? "⚠ Allergie-Hinweis" : "Notiz"}</div>
      <div>${order.notes}</div>
    </div>` : ""}

    ${hasAllergyNote ? "" : ""}

    <div class="spacer"></div>
    <div class="center" style="font-size:9px; color:#555;">Bon ${new Date().toLocaleTimeString("de-DE")}</div>
  `;
}

export function printKitchenTicket(order: Order, _settings?: PrintSettings) {
  openPrintWindow(`Küchenbon ${order.orderNumber}`, buildKitchenHtml(order));
}

// ── Kundenbon ─────────────────────────────────────────────────────────────────

export function buildCustomerHtml(order: Order, settings: PrintSettings = DEFAULT_SETTINGS): string {
  const itemsHtml = order.items
    .map((item) => {
      const opts = (item.optionsSnapshot ?? []) as OptSnap[];
      const variant = item.variantName ?? opts.find((o) => o.priceType === "absolute")?.optionItemName ?? null;
      const extras = opts.filter((o) => o.priceType !== "absolute" && (o.price ?? 0) > 0);
      return `
        <div style="margin: 4px 0;">
          <div class="row">
            <span class="label">${item.quantity}× ${item.itemName}${variant ? ` (${variant})` : ""}</span>
            <span class="val">${fmt(item.lineTotal)}</span>
          </div>
          ${extras.map((e) => `
          <div class="row item-extra">
            <span class="label">+ ${e.optionItemName}</span>
            <span class="val">${fmt(e.price)}</span>
          </div>`).join("")}
        </div>`;
    })
    .join("");

  const showDeliveryFee = Number(order.deliveryFee ?? 0) > 0;
  const showDiscount = Number(order.discountAmount ?? 0) > 0;
  const isPaid = order.paymentMethod !== "cash";

  return `
    <div class="center">
      <h1>${settings.restaurantName}</h1>
      ${settings.address ? `<div>${settings.address}</div>` : ""}
      ${settings.phone ? `<div>Tel: ${settings.phone}</div>` : ""}
      ${settings.email ? `<div>${settings.email}</div>` : ""}
    </div>
    <hr class="double">

    <div class="row">
      <span>Bestellnr.</span>
      <span class="bold">${order.orderNumber}</span>
    </div>
    <div class="row">
      <span>Datum</span>
      <span>${fmtTime(order.createdAt as unknown as string)}</span>
    </div>
    <div class="row">
      <span>Lieferart</span>
      <span>${order.orderType === "delivery" ? "Lieferung" : order.source === "dine_in" ? "Am Tisch" : "Abholung"}</span>
    </div>
    <hr>

    ${itemsHtml}
    <hr>

    <div class="row">
      <span>Zwischensumme</span>
      <span>${fmt(order.subtotal)}</span>
    </div>
    ${showDeliveryFee ? `
    <div class="row">
      <span>Lieferkosten</span>
      <span>${fmt(order.deliveryFee)}</span>
    </div>` : ""}
    ${showDiscount ? `
    <div class="row">
      <span>Rabatt${order.couponCode ? ` (${order.couponCode})` : ""}</span>
      <span>-${fmt(order.discountAmount)}</span>
    </div>` : ""}
    <hr class="solid">
    <div class="row big">
      <span>GESAMT</span>
      <span>${fmt(order.total)}</span>
    </div>
    <hr>

    <div class="row">
      <span>Zahlung</span>
      <span class="bold">${PAY_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "-"}</span>
    </div>
    <div class="row">
      <span>Status</span>
      <span class="bold">${isPaid ? "✓ Bezahlt" : "⬤ Offen / Bar"}</span>
    </div>

    ${order.notes ? `<hr><div class="note-box"><div class="note-label">Notiz</div><div>${order.notes}</div></div>` : ""}

    <hr class="double">
    <div class="center" style="font-size:9px;">Vielen Dank für Ihre Bestellung!</div>
    <div class="center" style="font-size:9px; margin-top:2px;">Bon ${new Date().toLocaleTimeString("de-DE")}</div>
    <div class="spacer"></div>
  `;
}

export function printCustomerTicket(order: Order, settings: PrintSettings = DEFAULT_SETTINGS) {
  openPrintWindow(`Kundenbon ${order.orderNumber}`, buildCustomerHtml(order, settings));
}

// ── Fahrerbon ─────────────────────────────────────────────────────────────────

export function buildDriverHtml(order: Order, settings: PrintSettings = DEFAULT_SETTINGS): string {
  const isCash = order.paymentMethod === "cash";
  const isPaid = !isCash;

  return `
    <div class="invert bold">&nbsp;FAHRERBON&nbsp;</div>
    <div class="spacer"></div>

    <div class="center">
      <div class="xl">${order.orderNumber}</div>
      <div>${fmtTime(order.createdAt as unknown as string)}</div>
    </div>
    <hr>

    <div style="margin: 4px 0;">
      <div class="bold" style="font-size:13px;">👤 ${order.customerName}</div>
      ${order.customerPhone && order.customerPhone !== "-"
        ? `<div class="big">📞 ${order.customerPhone}</div>`
        : ""}
    </div>
    <hr>

    <div class="note-label">Lieferadresse</div>
    <div class="bold" style="font-size:13px; margin: 3px 0;">${order.deliveryAddress ?? "-"}</div>
    ${order.postalCode || order.city
      ? `<div class="big">${[order.postalCode, order.city].filter(Boolean).join(" ")}</div>`
      : ""}
    <hr>

    ${order.notes ? `
    <div class="note-box">
      <div class="note-label">Lieferhinweis / Notiz</div>
      <div>${order.notes}</div>
    </div>
    <hr>` : ""}

    <div class="row big">
      <span>Zahlungsart</span>
      <span>${PAY_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "-"}</span>
    </div>

    ${isCash ? `
    <div class="row xl" style="margin-top: 4px;">
      <span>Betrag</span>
      <span>${fmt(order.total)}</span>
    </div>
    <div class="note-box" style="margin-top:4px;">
      <div class="bold center">⚠ BITTE KASSIEREN: ${fmt(order.total)}</div>
    </div>` : `
    <div class="row bold">
      <span>Status</span>
      <span>✓ Bereits bezahlt</span>
    </div>
    <div class="row">
      <span>Betrag</span>
      <span>${fmt(order.total)}</span>
    </div>`}

    <hr class="double">
    <div class="center" style="font-size:9px;">${settings.restaurantName}</div>
    ${settings.phone ? `<div class="center" style="font-size:9px;">${settings.phone}</div>` : ""}
    <div class="center" style="font-size:9px; margin-top:2px;">Bon ${new Date().toLocaleTimeString("de-DE")}</div>
    <div class="spacer"></div>
  `;
}

export function printDriverTicket(order: Order, settings: PrintSettings = DEFAULT_SETTINGS) {
  openPrintWindow(`Fahrerbon ${order.orderNumber}`, buildDriverHtml(order, settings));
}

// ── Mock order for test prints ────────────────────────────────────────────────

export const MOCK_ORDER: Order = {
  id: 9999,
  orderNumber: "MCB-20260628-0042",
  orderType: "delivery",
  status: "preparing",
  customerName: "Max Mustermann",
  customerPhone: "0171 123 45 67",
  customerEmail: "max@example.de",
  deliveryAddress: "Musterstraße 42",
  postalCode: "12345",
  city: "Musterstadt",
  notes: "Bitte klingeln! Türcode: 1234",
  subtotal: 25.30,
  deliveryFee: 2.50,
  discountAmount: 0,
  total: 27.80,
  paymentMethod: "cash",
  couponCode: null,
  source: "phone",
  tableInfo: null,
  createdAt: new Date().toISOString(),
  customerId: null,
  items: [
    {
      id: 1,
      menuItemId: 1,
      itemName: "Cheeseburger",
      itemPrice: 11.50,
      quantity: 2,
      lineTotal: 23.00,
      variantName: "Large",
      extrasSnapshot: [],
      optionsSnapshot: [
        { groupId: 1, groupName: "Größe", optionItemId: 1, optionItemName: "Large", price: 11.50 },
        { groupId: 2, groupName: "Extras", optionItemId: 5, optionItemName: "Extra Käse", price: 0.80 },
      ] as Order["items"][number]["optionsSnapshot"],
    },
    {
      id: 2,
      menuItemId: 5,
      itemName: "Cola 0,33l",
      itemPrice: 2.50,
      quantity: 1,
      lineTotal: 2.50,
      variantName: null,
      extrasSnapshot: [],
      optionsSnapshot: [],
    },
  ],
} as Order;

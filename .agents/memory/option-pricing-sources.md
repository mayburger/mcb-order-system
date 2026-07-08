---
name: Optionspreis-Quellen im Restaurant-System
description: Wo die autoritativen Preise für Optionsgruppen wirklich liegen (nicht in optionItems.defaultPrice bei absoluten Gruppen)
---

# Optionspreis-Quellen

Regel: Bei **absoluten** Optionsgruppen (z. B. Pizza-Größe) liegt der echte Preis in der Tabelle `restaurant_item_option_prices` (keyed `menuItemId:optionItemId`), NICHT in `restaurant_option_items.default_price` — dort steht oft 0.00. Die Menü-Route reichert `defaultPrice` im API-Response daraus an. Bei **additiven** Gruppen gilt `priceByVariant[<Name der gewählten absoluten Option>]` mit Fallback `defaultPrice`.

**Why:** Beim Härten der Order-Route wurde zuerst `optionItems.defaultPrice` verwendet → Größenpreis 0 €. Der API-Response täuscht eine einzige Preisquelle vor, die es in der DB nicht gibt.

**How to apply:** Überall wo Optionspreise serverseitig berechnet werden (Bestellungen, Kasse), `itemOptionPrices` für absolute Gruppen joinen und Client-Preise ignorieren. Außerdem: `selectedOptions`-Gruppen müssen gegen `categoryOptionGroups`+`itemOptionGroups` autorisiert werden, sonst Preismanipulation über fremde Gruppen möglich.

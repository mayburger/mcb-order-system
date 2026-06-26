import { Router } from "express";
import { db } from "@workspace/db";
import {
  openingHours,
  deliveryAreas,
  settings,
} from "@workspace/db/schema";
import { asc, eq } from "drizzle-orm";

const router = Router();

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

async function getSettingsMap(): Promise<Map<string, string>> {
  const rows = await db.select().from(settings);
  return new Map(rows.map((r) => [r.key, r.value]));
}

router.get("/restaurant/info", async (req, res) => {
  try {
    const map = await getSettingsMap();
    res.json({
      name: map.get("restaurantName") ?? "May Chicken & Burger",
      tagline: map.get("tagline") ?? null,
      address: map.get("address") ?? "",
      phone: map.get("phone") ?? "",
      email: map.get("email") ?? null,
      deliveryEnabled: map.get("deliveryEnabled") !== "false",
      pickupEnabled: map.get("pickupEnabled") !== "false",
      minDeliveryOrder: Number(map.get("minDeliveryOrder") ?? 15),
      estimatedDeliveryTime: Number(map.get("estimatedDeliveryTime") ?? 30),
      estimatedPickupTime: Number(map.get("estimatedPickupTime") ?? 15),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/restaurant/opening-hours", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(openingHours)
      .orderBy(asc(openingHours.dayOfWeek));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/restaurant/delivery-areas", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(deliveryAreas)
      .where(eq(deliveryAreas.active, true))
      .orderBy(asc(deliveryAreas.name));
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        postalCode: r.postalCode,
        minOrder: Number(r.minOrder),
        deliveryFee: Number(r.deliveryFee),
        deliveryTime: r.deliveryTime ?? "30-45 Min.",
        active: r.active,
      })),
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
export { DAY_NAMES, getSettingsMap };

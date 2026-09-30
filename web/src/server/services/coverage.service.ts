import "server-only";
import { unprocessable } from "../lib/errors";
import { createAdminClient, createUserClient } from "../lib/supabase";
import { cityModel } from "../models/city.model";

export type Coverage =
  | { status: "served"; city: { id: string; name: string }; area: { id: string; name: string; extraCharge: number } }
  | { status: "area_not_served" | "city_inactive"; city: { id: string; name: string } }
  | { status: "unknown" };

export const coverageService = {
  async check(pincode: string): Promise<Coverage> {
    const db = await createUserClient();
    const area = await cityModel.findAreaByPincode(db, pincode);
    if (!area) return { status: "unknown" };
    const city = { id: area.city.id, name: area.city.name };
    if (!area.city.is_active) return { status: "city_inactive", city };
    if (!area.is_active) return { status: "area_not_served", city };
    return { status: "served", city, area: { id: area.id, name: area.name, extraCharge: area.extra_charge } };
  },

  /** Returns the area + city for a serviceable pincode, or throws. */
  async assertServed(pincode: string) {
    const db = createAdminClient();
    const area = await cityModel.findAreaByPincode(db, pincode);
    if (!area || !area.is_active || !area.city.is_active) {
      throw unprocessable("Sorry, we don't serve this pincode yet.", "NOT_SERVICEABLE");
    }
    return area;
  },

  async joinWaitlist(email: string, pincode: string) {
    const db = createAdminClient();
    const area = await cityModel.findAreaByPincode(db, pincode);
    await cityModel.addToWaitlist(db, { email, pincode, city_id: area?.city.id ?? null });
  },
};

import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { SlotRow } from "../types/db";

export const slotModel = {
  async listForAreaAndDate(db: Db, areaId: string, date: string): Promise<SlotRow[]> {
    return check(
      await db.from("time_slots").select("*").eq("area_id", areaId).eq("slot_date", date).order("start_time"),
    ) as SlotRow[];
  },

  async findById(db: Db, id: string): Promise<SlotRow | null> {
    return check(await db.from("time_slots").select("*").eq("id", id).maybeSingle()) as SlotRow | null;
  },

  async update(db: Db, id: string, patch: Partial<Pick<SlotRow, "capacity" | "is_blocked">>) {
    return check(await db.from("time_slots").update(patch).eq("id", id).select("*").single()) as SlotRow;
  },

  async release(db: Db, slotId: string) {
    check(await db.rpc("release_slot", { p_slot_id: slotId }));
  },

  async generate(db: Db, days: number): Promise<number> {
    return check(await db.rpc("generate_time_slots", { p_days: days })) as number;
  },
};

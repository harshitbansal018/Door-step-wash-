import "server-only";
import { randomBytes } from "node:crypto";
import type { z } from "zod";
import { conflict, notFound, unprocessable } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";
import { cityModel } from "../models/city.model";
import { userModel } from "../models/user.model";
import { workerModel, type WorkerWithProfile } from "../models/worker.model";
import type { WorkerRow } from "../types/db";
import type { createWorkerSchema, updateWorkerSchema } from "../validators/admin.validator";
import { notificationService } from "./notification.service";
import { storageService } from "./storage.service";

function present(w: WorkerWithProfile) {
  return {
    id: w.id,
    name: w.profile.full_name,
    email: w.profile.email,
    phone: w.profile.phone,
    city: w.city?.name ?? null,
    cityId: w.city_id,
    area: w.area?.name ?? null,
    areaId: w.area_id,
    status: w.status,
    isOnline: w.is_online,
    rating: Number(w.rating),
    jobsDone: w.jobs_done,
    commissionRate: Number(w.commission_rate),
    hasKycDocument: !!w.kyc_document_path,
    bankLast4: w.bank_last4,
    joinedAt: w.created_at,
  };
}

export const adminWorkerService = {
  async list(filter: { cityId?: string; status?: WorkerRow["status"] }) {
    return (await workerModel.list(createAdminClient(), filter)).map(present);
  },

  /**
   * Creates a partner login (email already confirmed, random password) and
   * emails them. They set their own password through "Forgot password".
   */
  async create(input: z.infer<typeof createWorkerSchema>) {
    const db = createAdminClient();
    const area = await cityModel.findAreaById(db, input.areaId);
    if (!area) throw notFound("Area");
    if (await userModel.findByEmail(db, input.email)) {
      throw conflict("An account with this email already exists.", "EMAIL_TAKEN");
    }

    const { data, error } = await db.auth.admin.createUser({
      email: input.email,
      password: randomBytes(24).toString("base64url"),
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });
    if (error || !data.user) throw error ?? new Error("Could not create user");

    try {
      await userModel.setRole(db, data.user.id, "worker");
      await workerModel.insert(db, {
        id: data.user.id,
        city_id: area.city_id,
        area_id: area.id,
        commission_rate: input.commissionRate,
      });
    } catch (err) {
      await db.auth.admin.deleteUser(data.user.id);
      throw err;
    }

    await notificationService.workerWelcome(input.email, input.fullName);
    const created = await workerModel.findWithProfile(db, data.user.id);
    return present(created!);
  },

  async update(id: string, input: z.infer<typeof updateWorkerSchema>) {
    const db = createAdminClient();
    const worker = await workerModel.findById(db, id);
    if (!worker) throw notFound("Worker");

    const patch: Partial<WorkerRow> = {};
    if (input.status !== undefined) {
      if (input.status === "active" && !worker.kyc_document_path) {
        throw unprocessable("Upload the worker's KYC document before activating them.", "KYC_MISSING");
      }
      patch.status = input.status;
      if (input.status !== "active") patch.is_online = false;
    }
    if (input.areaId !== undefined) {
      const area = await cityModel.findAreaById(db, input.areaId);
      if (!area) throw notFound("Area");
      patch.area_id = area.id;
      patch.city_id = area.city_id;
    }
    if (input.commissionRate !== undefined) patch.commission_rate = input.commissionRate;
    if (input.bankLast4 !== undefined) patch.bank_last4 = input.bankLast4;

    await workerModel.update(db, id, patch);
    return present((await workerModel.findWithProfile(db, id))!);
  },

  async uploadKyc(id: string, file: File) {
    const db = createAdminClient();
    const worker = await workerModel.findById(db, id);
    if (!worker) throw notFound("Worker");
    const path = await storageService.upload(db, "kyc", id, file);
    await workerModel.update(db, id, { kyc_document_path: path });
    if (worker.kyc_document_path) await storageService.remove(db, "kyc", [worker.kyc_document_path]);
    return { uploaded: true };
  },

  async kycLink(id: string) {
    const db = createAdminClient();
    const worker = await workerModel.findById(db, id);
    if (!worker?.kyc_document_path) throw notFound("KYC document");
    return { url: await storageService.signedUrl(db, "kyc", worker.kyc_document_path, 120) };
  },
};

import "server-only";
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
  async list(q: { cityId?: string; status?: WorkerRow["status"]; page: number; pageSize: number }) {
    const from = (q.page - 1) * q.pageSize;
    const db = createAdminClient();
    const [{ rows, total }, counts] = await Promise.all([
      workerModel.list(db, { cityId: q.cityId, status: q.status, from, to: from + q.pageSize - 1 }),
      workerModel.counts(db),
    ]);
    return { items: rows.map(present), page: q.page, pageSize: q.pageSize, total, counts };
  },

  /** Creates a confirmed partner login and emails the initial credentials. */
  async create(input: z.infer<typeof createWorkerSchema>) {
    const db = createAdminClient();
    const area = await cityModel.findAreaById(db, input.areaId);
    if (!area) throw notFound("Area");
    if (await userModel.findByEmail(db, input.email)) {
      throw conflict("An account with this email already exists.", "EMAIL_TAKEN");
    }

    const { data, error } = await db.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });
    if (error || !data.user) throw error ?? new Error("Could not create user");

    try {
      await userModel.update(db, data.user.id, { role: "worker", phone: input.phone });
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

    await notificationService.workerWelcome(input.email, input.fullName, input.password);
    const created = await workerModel.findWithProfile(db, data.user.id);
    return present(created!);
  },

  async update(id: string, input: z.infer<typeof updateWorkerSchema>) {
    const db = createAdminClient();
    const worker = await workerModel.findById(db, id);
    if (!worker) throw notFound("Worker");
    const profile = await userModel.findById(db, id);
    if (!profile) throw notFound("Worker profile");

    const emailChanged = input.email !== undefined && input.email !== profile.email;
    if (emailChanged && (await userModel.findByEmail(db, input.email!))) {
      throw conflict("An account with this email already exists.", "EMAIL_TAKEN");
    }

    const authPatch: {
      email?: string;
      email_confirm?: boolean;
      password?: string;
      user_metadata?: { full_name: string };
    } = {};
    if (emailChanged) {
      authPatch.email = input.email;
      authPatch.email_confirm = true;
    }
    if (input.password !== undefined) authPatch.password = input.password;
    if (input.fullName !== undefined) authPatch.user_metadata = { full_name: input.fullName };
    if (Object.keys(authPatch).length) {
      const { error } = await db.auth.admin.updateUserById(id, authPatch);
      if (error) throw error;
    }

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

    const profilePatch = {
      ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
      ...(emailChanged ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    };
    if (Object.keys(profilePatch).length) await userModel.update(db, id, profilePatch);
    if (Object.keys(patch).length) await workerModel.update(db, id, patch);
    const updated = (await workerModel.findWithProfile(db, id))!;
    if (emailChanged || input.password !== undefined) {
      await notificationService.workerCredentialsUpdated(
        updated.profile.email,
        updated.profile.full_name,
        input.password,
      );
    }
    return present(updated);
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

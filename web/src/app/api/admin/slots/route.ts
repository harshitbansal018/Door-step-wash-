import { adminController } from "@/server/controllers/admin.controller";

export const GET = adminController.listSlots;
export const POST = adminController.createSlot;

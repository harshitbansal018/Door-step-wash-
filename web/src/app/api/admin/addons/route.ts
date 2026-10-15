import { adminController } from "@/server/controllers/admin.controller";

export const GET = adminController.listAddons;
export const POST = adminController.createAddon;

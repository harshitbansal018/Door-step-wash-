import { adminController } from "@/server/controllers/admin.controller";

export const GET = adminController.listPayouts;
export const POST = adminController.buildPayouts;

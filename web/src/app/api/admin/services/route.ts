import { adminController } from "@/server/controllers/admin.controller";

export const GET = adminController.listServices;
export const POST = adminController.createService;

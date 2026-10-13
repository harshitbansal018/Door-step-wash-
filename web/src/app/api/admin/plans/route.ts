import { adminController } from "@/server/controllers/admin.controller";

export const GET = adminController.listPlans;
export const POST = adminController.createPlan;

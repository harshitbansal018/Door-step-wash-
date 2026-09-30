import { adminController } from "@/server/controllers/admin.controller";

export const GET = adminController.listWorkers;
export const POST = adminController.createWorker;

import { adminController } from "@/server/controllers/admin.controller";

export const GET = adminController.listCities;
export const POST = adminController.createCity;

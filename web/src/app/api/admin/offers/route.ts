import { adminController } from "@/server/controllers/admin.controller";

export const GET = adminController.listOffers;
export const POST = adminController.createOffer;

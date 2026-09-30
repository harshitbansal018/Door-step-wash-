import { bookingController } from "@/server/controllers/booking.controller";

export const GET = bookingController.listMine;
export const POST = bookingController.create;

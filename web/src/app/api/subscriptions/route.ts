import { subscriptionController } from "@/server/controllers/subscription.controller";

export const GET = subscriptionController.mine;
export const POST = subscriptionController.start;

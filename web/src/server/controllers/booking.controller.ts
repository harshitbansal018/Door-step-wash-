import "server-only";
import { withAuth } from "../middlewares/auth.middleware";
import { created, ok } from "../lib/response";
import { bookingService } from "../services/booking.service";
import {
  cancelBookingSchema,
  createBookingSchema,
  myBookingsQuery,
  rescheduleSchema,
  reviewSchema,
  validateOfferSchema,
} from "../validators/booking.validator";
import { readJson, readQuery, uuid } from "../validators/common";

type IdParams = { id: string };

export const bookingController = {
  validateOffer: withAuth(["customer"], async (req, auth) => {
    const input = await readJson(req, validateOfferSchema);
    return ok(await bookingService.quote(auth, input));
  }),

  create: withAuth(["customer"], async (req, auth) =>
    created(await bookingService.create(auth, await readJson(req, createBookingSchema))),
  ),

  listMine: withAuth(["customer"], async (req, auth) =>
    ok(await bookingService.listMine(auth, readQuery(req, myBookingsQuery))),
  ),

  getMine: withAuth<IdParams>(["customer"], async (_req, auth, { id }) =>
    ok(await bookingService.getMine(auth, uuid.parse(id))),
  ),

  cancel: withAuth<IdParams>(["customer"], async (req, auth, { id }) => {
    const { reason } = await readJson(req, cancelBookingSchema);
    return ok(await bookingService.cancelByCustomer(auth, uuid.parse(id), reason));
  }),

  reschedule: withAuth<IdParams>(["customer"], async (req, auth, { id }) => {
    const { slotId } = await readJson(req, rescheduleSchema);
    return ok(await bookingService.reschedule(auth, uuid.parse(id), slotId));
  }),

  review: withAuth<IdParams>(["customer"], async (req, auth, { id }) =>
    created(await bookingService.review(auth, uuid.parse(id), await readJson(req, reviewSchema))),
  ),
};

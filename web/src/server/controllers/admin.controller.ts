import "server-only";
import { badRequest } from "../lib/errors";
import { withAuth } from "../middlewares/auth.middleware";
import { created, noContent, ok } from "../lib/response";
import { adminBookingService } from "../services/admin-booking.service";
import { adminCatalogService } from "../services/admin-catalog.service";
import { adminCityService } from "../services/admin-city.service";
import { adminOfferService } from "../services/admin-offer.service";
import { adminPayoutService } from "../services/admin-payout.service";
import { adminUserService } from "../services/admin-user.service";
import { adminWorkerService } from "../services/admin-worker.service";
import { dashboardService } from "../services/dashboard.service";
import type { UserRole } from "../types/db";
import {
  adminCancelSchema,
  assignSchema,
  createAreaSchema,
  createCitySchema,
  createOfferSchema,
  createWorkerSchema,
  generateSlotsSchema,
  listBookingsQuery,
  listUsersQuery,
  listWorkersQuery,
  markPayoutPaidSchema,
  payoutsQuery,
  pricesQuery,
  refundSchema,
  setPricesSchema,
  updateAreaSchema,
  updateCitySchema,
  updateOfferSchema,
  updateServiceSchema,
  updateSlotSchema,
  updateUserSchema,
  updateWorkerSchema,
} from "../validators/admin.validator";
import { pagination, readJson, readQuery, uuid } from "../validators/common";

type IdParams = { id: string };
const ADMIN: UserRole[] = ["admin"];

export const adminController = {
  // ------------------------------------------------------------ dashboard
  dashboard: withAuth(ADMIN, async () => ok(await dashboardService.summary())),

  // ------------------------------------------------------------ cities & areas
  listCities: withAuth(ADMIN, async () => ok(await adminCityService.list())),
  createCity: withAuth(ADMIN, async (req) => created(await adminCityService.create(await readJson(req, createCitySchema)))),
  updateCity: withAuth<IdParams>(ADMIN, async (req, _a, { id }) =>
    ok(await adminCityService.update(uuid.parse(id), await readJson(req, updateCitySchema))),
  ),
  createArea: withAuth<IdParams>(ADMIN, async (req, _a, { id }) =>
    created(await adminCityService.addArea(uuid.parse(id), await readJson(req, createAreaSchema))),
  ),
  updateArea: withAuth<IdParams>(ADMIN, async (req, _a, { id }) =>
    ok(await adminCityService.updateArea(uuid.parse(id), await readJson(req, updateAreaSchema))),
  ),
  deleteArea: withAuth<IdParams>(ADMIN, async (_req, _a, { id }) => {
    await adminCityService.deleteArea(uuid.parse(id));
    return noContent();
  }),

  // ------------------------------------------------------------ services, prices, slots
  listServices: withAuth(ADMIN, async (req) =>
    ok(await adminCatalogService.servicesWithPrices(readQuery(req, pricesQuery).cityId)),
  ),
  updateService: withAuth<IdParams>(ADMIN, async (req, _a, { id }) =>
    ok(await adminCatalogService.updateService(uuid.parse(id), await readJson(req, updateServiceSchema))),
  ),
  setPrices: withAuth(ADMIN, async (req) => ok(await adminCatalogService.setPrices(await readJson(req, setPricesSchema)))),
  generateSlots: withAuth(ADMIN, async (req) =>
    ok(await adminCatalogService.generateSlots((await readJson(req, generateSlotsSchema)).days)),
  ),
  updateSlot: withAuth<IdParams>(ADMIN, async (req, _a, { id }) =>
    ok(await adminCatalogService.updateSlot(uuid.parse(id), await readJson(req, updateSlotSchema))),
  ),

  // ------------------------------------------------------------ workers
  listWorkers: withAuth(ADMIN, async (req) => ok(await adminWorkerService.list(readQuery(req, listWorkersQuery)))),
  createWorker: withAuth(ADMIN, async (req) =>
    created(await adminWorkerService.create(await readJson(req, createWorkerSchema))),
  ),
  updateWorker: withAuth<IdParams>(ADMIN, async (req, _a, { id }) =>
    ok(await adminWorkerService.update(uuid.parse(id), await readJson(req, updateWorkerSchema))),
  ),
  uploadWorkerKyc: withAuth<IdParams>(ADMIN, async (req, _a, { id }) => {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) throw badRequest("Attach the document in the `file` field.", "FILE_REQUIRED");
    return created(await adminWorkerService.uploadKyc(uuid.parse(id), file));
  }),
  workerKycLink: withAuth<IdParams>(ADMIN, async (_req, _a, { id }) =>
    ok(await adminWorkerService.kycLink(uuid.parse(id))),
  ),

  // ------------------------------------------------------------ offers
  listOffers: withAuth(ADMIN, async () => ok(await adminOfferService.list())),
  createOffer: withAuth(ADMIN, async (req, auth) =>
    created(await adminOfferService.create(auth.userId, await readJson(req, createOfferSchema))),
  ),
  updateOffer: withAuth<IdParams>(ADMIN, async (req, _a, { id }) =>
    ok(await adminOfferService.update(uuid.parse(id), await readJson(req, updateOfferSchema))),
  ),

  // ------------------------------------------------------------ bookings
  listBookings: withAuth(ADMIN, async (req) => ok(await adminBookingService.list(readQuery(req, listBookingsQuery)))),
  getBooking: withAuth<IdParams>(ADMIN, async (_req, _a, { id }) => ok(await adminBookingService.detail(uuid.parse(id)))),
  bookingCandidates: withAuth<IdParams>(ADMIN, async (_req, _a, { id }) =>
    ok(await adminBookingService.candidates(uuid.parse(id))),
  ),
  assignBooking: withAuth<IdParams>(ADMIN, async (req, auth, { id }) => {
    const { workerId } = await readJson(req, assignSchema);
    return ok(await adminBookingService.assign(auth.userId, uuid.parse(id), workerId));
  }),
  cancelBooking: withAuth<IdParams>(ADMIN, async (req, auth, { id }) =>
    ok(await adminBookingService.cancel(auth.userId, uuid.parse(id), await readJson(req, adminCancelSchema))),
  ),

  // ------------------------------------------------------------ money
  refund: withAuth(ADMIN, async (req, auth) =>
    created(await adminBookingService.refund(auth.userId, await readJson(req, refundSchema))),
  ),
  transactions: withAuth(ADMIN, async (req) => {
    const q = readQuery(req, pagination);
    return ok(await adminPayoutService.transactions(q.page, q.pageSize));
  }),
  listPayouts: withAuth(ADMIN, async (req) => ok(await adminPayoutService.list(readQuery(req, payoutsQuery).status))),
  buildPayouts: withAuth(ADMIN, async () => ok(await adminPayoutService.build())),
  markPayoutPaid: withAuth<IdParams>(ADMIN, async (req, auth, { id }) => {
    const { reference } = await readJson(req, markPayoutPaidSchema);
    return ok(await adminPayoutService.markPaid(auth.userId, uuid.parse(id), reference));
  }),

  // ------------------------------------------------------------ users
  listUsers: withAuth(ADMIN, async (req) => ok(await adminUserService.list(readQuery(req, listUsersQuery)))),
  updateUser: withAuth<IdParams>(ADMIN, async (req, auth, { id }) => {
    const { isBlocked } = await readJson(req, updateUserSchema);
    return ok(await adminUserService.setBlocked(auth.userId, uuid.parse(id), isBlocked));
  }),
};

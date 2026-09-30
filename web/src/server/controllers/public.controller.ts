import "server-only";
import { withPublic } from "../middlewares/auth.middleware";
import { created, ok } from "../lib/response";
import { catalogService } from "../services/catalog.service";
import { coverageService } from "../services/coverage.service";
import { catalogQuery, coverageQuery, slotsQuery, waitlistSchema } from "../validators/booking.validator";
import { readJson, readQuery } from "../validators/common";

export const publicController = {
  coverage: withPublic(async (req) => ok(await coverageService.check(readQuery(req, coverageQuery).pincode))),

  catalog: withPublic(async (req) => ok(await catalogService.forArea(readQuery(req, catalogQuery).areaId))),

  slots: withPublic(async (req) => {
    const q = readQuery(req, slotsQuery);
    return ok(await catalogService.slots(q.areaId, q.date));
  }),

  joinWaitlist: withPublic(async (req) => {
    const input = await readJson(req, waitlistSchema);
    await coverageService.joinWaitlist(input.email, input.pincode);
    return created({ joined: true });
  }),
};

import "server-only";
import { withPublic } from "../middlewares/auth.middleware";
import { created, ok } from "../lib/response";
import { addonService } from "../services/addon.service";
import { catalogService } from "../services/catalog.service";
import { coverageService } from "../services/coverage.service";
import { planService } from "../services/plan.service";
import { catalogQuery, coverageQuery, slotsQuery, waitlistSchema } from "../validators/booking.validator";
import { readJson, readQuery } from "../validators/common";
import { planOptionsQuery, plansQuery } from "../validators/plan.validator";

export const publicController = {
  cities: withPublic(async () => ok(await coverageService.cities())),
  coverage: withPublic(async (req) => ok(await coverageService.check(readQuery(req, coverageQuery).pincode))),

  catalog: withPublic(async (req) => ok(await catalogService.forArea(readQuery(req, catalogQuery).areaId))),
  addons: withPublic(async () => ok(await addonService.listPublic())),
  startingPrices: withPublic(async () => ok(await catalogService.startingPrices())),

  plans: withPublic(async (req) => ok(await planService.list(readQuery(req, plansQuery).areaId))),
  planOptions: withPublic(async (req) => ok(await planService.options(readQuery(req, planOptionsQuery).pincode))),

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

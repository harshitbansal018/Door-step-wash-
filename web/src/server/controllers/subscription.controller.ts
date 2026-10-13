import "server-only";
import { withAuth } from "../middlewares/auth.middleware";
import { created, ok } from "../lib/response";
import { subscriptionService } from "../services/subscription.service";
import {
  cancelSubscriptionSchema,
  changeVisitSchema,
  planQuoteSchema,
  startSubscriptionSchema,
} from "../validators/plan.validator";
import { readJson, uuid } from "../validators/common";

type IdParams = { id: string };

export const subscriptionController = {
  quote: withAuth(["customer"], async (req) =>
    ok(await subscriptionService.quote(await readJson(req, planQuoteSchema))),
  ),

  start: withAuth(["customer"], async (req, auth) =>
    created(await subscriptionService.start(auth, await readJson(req, startSubscriptionSchema))),
  ),

  mine: withAuth(["customer"], async (_req, auth) => ok(await subscriptionService.mine(auth))),

  pause: withAuth<IdParams>(["customer"], async (_req, auth, { id }) =>
    ok(await subscriptionService.pause(auth, uuid.parse(id))),
  ),

  resume: withAuth<IdParams>(["customer"], async (_req, auth, { id }) =>
    ok(await subscriptionService.resume(auth, uuid.parse(id))),
  ),

  cancel: withAuth<IdParams>(["customer"], async (req, auth, { id }) => {
    const { reason } = await readJson(req, cancelSubscriptionSchema);
    return ok(await subscriptionService.cancel(auth, uuid.parse(id), reason));
  }),

  renew: withAuth<IdParams>(["customer"], async (_req, auth, { id }) =>
    created(await subscriptionService.renew(auth, uuid.parse(id))),
  ),

  changeVisit: withAuth<IdParams>(["customer"], async (req, auth, { id }) =>
    ok(await subscriptionService.changeVisit(auth, uuid.parse(id), await readJson(req, changeVisitSchema))),
  ),
};

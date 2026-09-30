import "server-only";
import { badRequest } from "../lib/errors";
import { withAuth } from "../middlewares/auth.middleware";
import { created, ok } from "../lib/response";
import { workerService } from "../services/worker.service";
import { readJson, uuid } from "../validators/common";
import { onlineSchema, photoKindSchema, progressSchema, respondSchema } from "../validators/worker.validator";

type IdParams = { id: string };

export const workerController = {
  me: withAuth(["worker"], async (_req, auth) => ok(await workerService.me(auth))),

  setStatus: withAuth(["worker"], async (req, auth) => {
    const { online } = await readJson(req, onlineSchema);
    return ok(await workerService.setOnline(auth, online));
  }),

  jobs: withAuth(["worker"], async (_req, auth) => ok(await workerService.jobs(auth))),

  job: withAuth<IdParams>(["worker"], async (_req, auth, { id }) => ok(await workerService.job(auth, uuid.parse(id)))),

  respond: withAuth<IdParams>(["worker"], async (req, auth, { id }) => {
    const { accept } = await readJson(req, respondSchema);
    return ok(await workerService.respond(auth, uuid.parse(id), accept));
  }),

  progress: withAuth<IdParams>(["worker"], async (req, auth, { id }) => {
    const { status } = await readJson(req, progressSchema);
    return ok(await workerService.advance(auth, uuid.parse(id), status));
  }),

  /** multipart/form-data with fields `kind` (before | after) and `file`. */
  uploadPhoto: withAuth<IdParams>(["worker"], async (req, auth, { id }) => {
    const form = await req.formData();
    const kind = photoKindSchema.parse(form.get("kind"));
    const file = form.get("file");
    if (!(file instanceof File)) throw badRequest("Attach a photo in the `file` field.", "FILE_REQUIRED");
    return created(await workerService.uploadPhoto(auth, uuid.parse(id), kind, file));
  }),

  earnings: withAuth(["worker"], async (_req, auth) => ok(await workerService.earnings(auth))),
};

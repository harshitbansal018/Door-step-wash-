import { BOOKINGS, WORKERS } from "./data";

// Until auth exists, the partner app shows one demo worker and their jobs.
export const DEMO_WORKER = WORKERS[0];

// A confirmed booking offered to the demo worker, plus the jobs already assigned to them.
export const JOB_REQUEST = BOOKINGS.find((b) => b.id === "BK-10480")!;
export const WORKER_JOBS = BOOKINGS.filter((b) => b.workerId === DEMO_WORKER.id);

export const findWorkerJob = (id: string) =>
  [JOB_REQUEST, ...WORKER_JOBS].find((b) => b.id === id);

export const COMMISSION_RATE = 0.4;

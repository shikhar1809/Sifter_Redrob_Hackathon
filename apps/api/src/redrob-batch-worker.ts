import { parentPort, workerData } from "node:worker_threads";
import { rankRedrobCandidates, type RedrobCandidate } from "@seederpro/core";

type WorkerData = {
  candidates: RedrobCandidate[];
  limit: number;
};

const data = workerData as WorkerData;

try {
  const rows = rankRedrobCandidates({ candidates: data.candidates, limit: data.limit });
  parentPort?.postMessage({ ok: true, rows });
} catch (error) {
  parentPort?.postMessage({ ok: false, error: error instanceof Error ? error.message : "Batch ranking failed" });
}

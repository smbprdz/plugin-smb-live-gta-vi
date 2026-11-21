import { dedupeCandidates } from "./candidates.js";
import { DEFAULT_SETTINGS, enabledPlatformIds, normalizePlatforms } from "./settings.js";
import { getStorage } from "./storage.js";

const CACHE_MS = 45_000;
const recent = new Map();

async function discover(adapter) {
  const previous = recent.get(adapter.id);
  if (previous && previous.expires > Date.now()) return previous.result;
  const result = await adapter.fetchLiveChannels();
  recent.set(adapter.id, { expires: Date.now() + CACHE_MS, result });
  return result;
}

export async function readSettings() {
  const settings = await getStorage(DEFAULT_SETTINGS);
  return {
    platformIds: enabledPlatformIds(normalizePlatforms(settings.platforms)),
    separateLives: settings.separateLives !== false
  };
}

export async function collectCandidates(adapters, platformIds) {
  const active = adapters.filter((adapter) => platformIds.includes(adapter.id));
  const outcomes = await Promise.allSettled(active.map(discover));
  const candidates = [];
  const sources = {};

  outcomes.forEach((outcome, index) => {
    const { id } = active[index];
    if (outcome.status === "rejected") {
      sources[id] = { state: "unavailable", count: 0 };
      return;
    }

    const found = dedupeCandidates(outcome.value.candidates);
    candidates.push(...found);
    sources[id] = { state: outcome.value.complete ? "ok" : "partial", count: found.length };
  });

  return { candidates, sources };
}

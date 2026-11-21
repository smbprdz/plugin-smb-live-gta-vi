import { dedupeCandidates } from "./candidates.js";
import { readRegionSelection } from "./regions.js";
import { DEFAULT_SETTINGS, enabledPlatformIds, normalizePlatforms } from "./settings.js";
import { getStorage } from "./storage.js";

const CACHE_MS = 45_000;
const recent = new Map();

async function discover(adapter, selection) {
  const key = [adapter.id, selection.region, selection.mode].join(":");
  const now = Date.now();
  for (const [cachedKey, value] of recent) {
    if (value.expires <= now) recent.delete(cachedKey);
  }
  const previous = recent.get(key);
  if (previous) return previous.result;
  const result = await adapter.fetchLiveChannels(selection);
  recent.set(key, { expires: Date.now() + CACHE_MS, result });
  return result;
}

export async function readSettings() {
  const settings = await getStorage(DEFAULT_SETTINGS);
  return {
    ...readRegionSelection(settings),
    platformIds: enabledPlatformIds(normalizePlatforms(settings.platforms)),
    separateLives: settings.separateLives !== false
  };
}

export async function collectCandidates(adapters, platformIds, selection) {
  const active = adapters.filter((adapter) => platformIds.includes(adapter.id));
  const outcomes = await Promise.allSettled(active.map((adapter) => discover(adapter, selection)));
  const candidates = [];
  const sources = {};

  outcomes.forEach((outcome, index) => {
    const { id } = active[index];
    if (outcome.status === "rejected") {
      sources[id] = { state: "unavailable", count: 0, regional: 0 };
      return;
    }

    const unique = dedupeCandidates(outcome.value.candidates);
    const found = selection.mode === "only" ? unique.filter((candidate) => candidate.regionalMatch) : unique;
    candidates.push(...found);
    sources[id] = {
      state: outcome.value.complete ? "ok" : "partial",
      count: found.length,
      regional: found.filter((candidate) => candidate.regionalMatch).length
    };
  });

  return { candidates, sources };
}

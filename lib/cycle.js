import { getStorage, setStorage } from "./storage.js";
import { groupByIdentity } from "./candidates.js";

export const CYCLES_KEY = "cycles";
let queue = Promise.resolve();

function serialize(action) {
  const next = queue.then(action);
  queue = next.catch(() => {});
  return next;
}

function cycleKey({ region, mode, separateLives }) {
  const unit = separateLives ? "byLive" : "byCreator";
  return region === "BR" && mode === "only" ? unit : [region, mode, unit].join(":");
}

export function readCycle(cycles, selection) {
  const current = cycles?.[cycleKey(selection)];
  return {
    seen: Array.isArray(current?.seen) ? [...new Set(current.seen)] : [],
    last: typeof current?.last === "string" ? current.last : null
  };
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function drawAndOpen(candidates, selection, open) {
  return serialize(async () => {
    const groups = groupByIdentity(candidates, selection.separateLives);
    if (!groups.size) return null;

    const { cycles } = await getStorage({ [CYCLES_KEY]: {} });
    const current = readCycle(cycles, selection);
    const keys = [...groups.keys()];
    const seen = new Set(current.seen);
    let available = keys.filter((key) => !seen.has(key));

    if (!available.length) {
      available = keys.length === 1 ? keys : keys.filter((key) => key !== current.last);
      seen.clear();
    }

    const preferred = selection.mode === "prefer"
      ? available.filter((key) => groups.get(key).some((candidate) => candidate.regionalMatch))
      : [];
    const key = randomItem(preferred.length ? preferred : available);
    const group = groups.get(key);
    const chosen = randomItem(preferred.length ? group.filter((candidate) => candidate.regionalMatch) : group);
    await open(chosen.url);
    seen.add(key);
    await setStorage({
      [CYCLES_KEY]: { ...cycles, [cycleKey(selection)]: { seen: [...seen], last: key } }
    });
    return chosen;
  });
}

export function resetCycle(selection) {
  return serialize(async () => {
    const { cycles } = await getStorage({ [CYCLES_KEY]: {} });
    delete cycles[cycleKey(selection)];
    await setStorage({ [CYCLES_KEY]: cycles });
  });
}

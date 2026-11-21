import { getStorage, setStorage } from "./storage.js";
import { groupByIdentity } from "./candidates.js";

export const CYCLES_KEY = "cycles";
let queue = Promise.resolve();

function serialize(action) {
  const next = queue.then(action);
  queue = next.catch(() => {});
  return next;
}

function cycleKey(separateLives) {
  return separateLives ? "byLive" : "byCreator";
}

export function readCycle(cycles, separateLives) {
  const current = cycles?.[cycleKey(separateLives)];
  return {
    seen: Array.isArray(current?.seen) ? [...new Set(current.seen)] : [],
    last: typeof current?.last === "string" ? current.last : null
  };
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function drawAndOpen(candidates, separateLives, open) {
  return serialize(async () => {
    const groups = groupByIdentity(candidates, separateLives);
    if (!groups.size) return null;

    const { cycles } = await getStorage({ [CYCLES_KEY]: {} });
    const current = readCycle(cycles, separateLives);
    const keys = [...groups.keys()];
    const seen = new Set(current.seen);
    let available = keys.filter((key) => !seen.has(key));

    if (!available.length) {
      available = keys.length === 1 ? keys : keys.filter((key) => key !== current.last);
      seen.clear();
    }

    const key = randomItem(available);
    const chosen = randomItem(groups.get(key));
    await open(chosen.url);
    seen.add(key);
    await setStorage({
      [CYCLES_KEY]: { ...cycles, [cycleKey(separateLives)]: { seen: [...seen], last: key } }
    });
    return chosen;
  });
}

export function resetCycle(separateLives) {
  return serialize(async () => {
    const { cycles } = await getStorage({ [CYCLES_KEY]: {} });
    delete cycles[cycleKey(separateLives)];
    await setStorage({ [CYCLES_KEY]: cycles });
  });
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { makeCandidate } from "../lib/candidates.js";
import { drawAndOpen, readCycle, resetCycle } from "../lib/cycle.js";
import { collectCandidates, readSettings } from "../lib/orchestrator.js";
import { hasRegionSignals, readRegionSelection, regionOptions, regionProfile } from "../lib/regions.js";

let storage = {};
globalThis.chrome = {
  runtime: {},
  storage: { local: {
    get(defaults, callback) { callback(structuredClone({ ...defaults, ...storage })); },
    set(next, callback) { Object.assign(storage, structuredClone(next)); callback(); }
  } }
};

const brazil = { region: "BR", mode: "only", separateLives: true };
const usa = { region: "US", mode: "prefer", separateLives: true };
const world = { region: "ALL", mode: "all", separateLives: true };

function create(id, regionalMatch = false) {
  return makeCandidate({
    platform: "twitch",
    channelId: id,
    handle: id,
    url: "https://www.twitch.tv/" + id,
    regionalMatch
  });
}

test("worldwide selection and ISO country choices", () => {
  const list = regionOptions();
  assert.equal(list.length, 250);
  assert.equal(new Set(list.map(([code]) => code)).size, list.length);
  assert.deepEqual(list[0], ["ALL", "Todas as regiões"]);
  assert.deepEqual(readRegionSelection({ region: "all", regionMode: "only" }), { region: "ALL", mode: "all" });
  assert.deepEqual(readRegionSelection({ region: "br", regionMode: "invalid" }), { region: "BR", mode: "only" });
});

test("shared language alone does not match a country", () => {
  assert.equal(hasRegionSignals(regionProfile("US"), { language: "English", title: "GTA VI LIVE" }), false);
  assert.equal(hasRegionSignals(regionProfile("PT"), { language: "Portuguese", title: "GTA VI a jogar" }), true);
  assert.equal(hasRegionSignals(regionProfile("PT"), { language: "Spanish", title: "GTA VI en directo" }), false);
  assert.equal(hasRegionSignals(regionProfile("PT"), { title: "GTA VI en directo" }), false);
  assert.equal(hasRegionSignals(regionProfile("BR"), { language: "Portuguese", title: "GTA VI a jogar" }), false);
  assert.equal(hasRegionSignals(regionProfile("BR"), { language: "Portuguese", title: "GTA VI zerando" }), true);
  assert.equal(hasRegionSignals(regionProfile("US"), { tags: ["USA"] }), true);
  assert.equal(hasRegionSignals(regionProfile("GB"), { country: "US", tags: ["UK"] }), false);
  assert.equal(hasRegionSignals(regionProfile("MX"), { title: "GTA VI en vivo desde México" }), true);
  assert.equal(hasRegionSignals(regionProfile("JP"), { language: "ja-JP" }), true);
});

test("discovery filters only mode and caches per regional selection", async () => {
  const local = create("local", true);
  const foreign = create("foreign");
  const observed = [];
  const adapter = {
    id: "twitch",
    async fetchLiveChannels({ region }) {
      observed.push(region);
      return { candidates: [local, foreign], complete: false };
    }
  };

  assert.deepEqual((await collectCandidates([adapter], ["twitch"], brazil)).candidates, [local]);
  const preferred = await collectCandidates([adapter], ["twitch"], usa);
  assert.deepEqual(preferred.candidates, [local, foreign]);
  assert.deepEqual(preferred.sources.twitch, { state: "partial", count: 2, regional: 1 });
  await collectCandidates([adapter], ["twitch"], usa);
  assert.deepEqual(observed, ["BR", "US"]);
});

test("legacy Brazil round survives updates, while the preference round favors local results without repeats", async () => {
  storage = {
    cycles: { byLive: { seen: ["twitch:legacy"], last: "twitch:legacy" } },
    platforms: { twitch: true, youtube: false, kick: false }
  };
  assert.deepEqual(await readSettings(), { ...brazil, platformIds: ["twitch"] });
  assert.deepEqual(readCycle(storage.cycles, brazil).seen, ["twitch:legacy"]);

  const local = create("local", true);
  const foreign = create("foreign");
  const opened = [];
  const open = async (url) => { opened.push(url); };

  const first = await drawAndOpen([foreign, local], usa, open);
  const second = await drawAndOpen([foreign, local], usa, open);
  assert.equal(first, local);
  assert.equal(second, foreign);
  assert.deepEqual(opened, [local.url, foreign.url]);
  assert.deepEqual(readCycle(storage.cycles, world).seen, []);
  await resetCycle(usa);
  assert.deepEqual(readCycle(storage.cycles, usa).seen, []);
  assert.deepEqual(readCycle(storage.cycles, brazil).seen, ["twitch:legacy"]);
});

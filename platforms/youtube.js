import { isGtaViGameplay } from "../lib/brasil.js";
import { hasRegionSignals, regionProfile, WORLD } from "../lib/regions.js";
import { makeCandidate } from "../lib/candidates.js";

const SEARCH_URL = "https://www.youtube.com/results";
const WORLD_TERMS = [
  "GTA 6 live",
  "GTA VI gameplay",
  "Grand Theft Auto VI live",
  "GTA 6 ao vivo",
  "GTA VI en directo",
  "GTA 6 ライブ"
];
const LOCAL_TERMS = {
  ar: ["بث مباشر", "لعب"],
  de: ["live auf deutsch", "spielen"],
  es: ["en directo", "en vivo"],
  fr: ["en direct", "gameplay français"],
  it: ["in diretta", "gameplay italiano"],
  ja: ["ライブ", "生配信"],
  ko: ["라이브", "실시간"],
  pl: ["na żywo", "polska"],
  pt: ["ao vivo", "jogando", "zerando"],
  ru: ["прямой эфир", "стрим"],
  tr: ["canlı yayın", "oynuyoruz"],
  zh: ["直播", "游戏实况"]
};
const REGION_TERMS = {
  BR: ["GTA 6 ao vivo", "GTA VI ao vivo", "GTA 6 jogando", "GTA VI zerando", "GTA 6 modo história", "Grand Theft Auto VI gameplay Brasil"],
  PT: ["GTA 6 em direto", "GTA VI a jogar", "GTA 6 live Portugal", "Grand Theft Auto VI PT-PT"]
};

function searchRequests(profile, mode) {
  if (profile.region === WORLD) return WORLD_TERMS.map((term) => ({ term, locale: "en" }));
  const local = (LOCAL_TERMS[profile.language] ?? []).map((suffix) => "GTA 6 " + suffix);
  const countryName = new Intl.DisplayNames(["en"], { type: "region" }).of(profile.region);
  const terms = REGION_TERMS[profile.region] ?? ["GTA VI live " + countryName, ...local, "GTA VI gameplay", "GTA 6 live"];
  const requests = terms.map((term) => ({ term, locale: profile.locale, market: profile.region }));
  if (mode === "prefer" || profile.region !== "BR") {
    requests.push(...WORLD_TERMS.slice(0, 2).map((term) => ({ term, locale: "en" })));
  }
  return requests;
}

const LIVE_FILTER = "EgJAAQ==";
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const SEARCH_CACHE_MS = 45_000;
const searchCache = new Map();
const INITIAL_DATA = /<script\b[^>]*>\s*var\s+ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/i;

export const id = "youtube";

function text(value) {
  return value?.simpleText ?? value?.runs?.map((run) => run.text).join("") ?? "";
}

function candidateFromRenderer(renderer, profile) {
  const live = renderer.badges?.some((badge) => badge.metadataBadgeRenderer?.style === "BADGE_STYLE_TYPE_LIVE_NOW");
  if (!live || !VIDEO_ID.test(renderer.videoId ?? "")) return null;

  const title = text(renderer.title);
  const displayName = text(renderer.ownerText);
  if (!isGtaViGameplay(title)) return null;

  const owner = renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
  const handle = owner?.canonicalBaseUrl?.match(/^\/@([^/]+)$/u)?.[1]?.toLowerCase();
  const channelId = CHANNEL_ID.test(owner?.browseId ?? "") ? owner.browseId : handle;
  if (!channelId) return null;

  return makeCandidate({
    platform: id, channelId, displayName, handle,
    entryId: renderer.videoId, url: `https://www.youtube.com/watch?v=${renderer.videoId}`, title,
    regionalMatch: hasRegionSignals(profile, { title, name: displayName, details: text(renderer.detailedMetadataSnippets?.[0]?.snippetText) })
  });
}

function collect(node, page, profile) {
  if (Array.isArray(node)) {
    for (const item of node) collect(item, page, profile);
    return;
  }
  if (!node || typeof node !== "object") return;
  if (node.videoRenderer) {
    const candidate = candidateFromRenderer(node.videoRenderer, profile);
    if (candidate) page.candidates.push(candidate);
    return;
  }
  if (node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
    page.complete = false;
    return;
  }
  for (const value of Object.values(node)) collect(value, page, profile);
}

async function searchContent(url, signal) {
  const key = url.href;
  const now = Date.now();
  for (const [address, cached] of searchCache) {
    if (cached.expires <= now) searchCache.delete(address);
  }
  const previous = searchCache.get(key);
  if (previous) return previous.content;

  const response = await fetch(url, { credentials: "omit", signal });
  if (!response.ok) throw new Error(`YouTube retornou ${response.status}`);
  const html = await response.text();
  const data = html.match(INITIAL_DATA)?.[1];
  const content = data && JSON.parse(data).contents;
  if (!content) throw new Error("Busca do YouTube indisponível");
  searchCache.set(key, { content, expires: now + SEARCH_CACHE_MS });
  return content;
}

async function search({ term, locale, market }, profile, signal) {
  const url = new URL(SEARCH_URL);
  url.search = new URLSearchParams({ search_query: term, hl: locale, sp: LIVE_FILTER });
  if (market) url.searchParams.set("gl", market);
  const page = { candidates: [], complete: true };
  collect(await searchContent(url, signal), page, profile);
  return page;
}

export async function fetchLiveChannels({ region, mode }) {
  const profile = regionProfile(region);
  const signal = AbortSignal.timeout(10000);
  const results = await Promise.allSettled(searchRequests(profile, mode).map((request) => search(request, profile, signal)));
  const successful = results.filter((result) => result.status === "fulfilled");
  if (!successful.length) throw new Error("Busca do YouTube indisponível");
  return {
    candidates: successful.flatMap((result) => result.value.candidates),
    complete: successful.length === results.length && successful.every((result) => result.value.complete)
  };
}

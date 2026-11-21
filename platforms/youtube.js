import { isBrazilianAudience, isGtaViGameplay } from "../lib/brasil.js";
import { makeCandidate } from "../lib/candidates.js";

const SEARCH_URL = "https://www.youtube.com/results";
const SEARCH_TERMS = [
  "GTA 6 ao vivo",
  "GTA VI ao vivo",
  "GTA 6 jogando",
  "GTA VI zerando",
  "GTA 6 modo história",
  "Grand Theft Auto VI gameplay Brasil"
];
const LIVE_FILTER = "EgJAAQ==";
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const INITIAL_DATA = /<script\b[^>]*>\s*var\s+ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/i;

export const id = "youtube";

function text(value) {
  return value?.simpleText ?? value?.runs?.map((run) => run.text).join("") ?? "";
}

function candidateFromRenderer(renderer) {
  const live = renderer.badges?.some((badge) => badge.metadataBadgeRenderer?.style === "BADGE_STYLE_TYPE_LIVE_NOW");
  if (!live || !VIDEO_ID.test(renderer.videoId ?? "")) return null;

  const title = text(renderer.title);
  const displayName = text(renderer.ownerText);
  if (!isGtaViGameplay(title) || !isBrazilianAudience({ title, name: displayName })) return null;

  const owner = renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
  const handle = owner?.canonicalBaseUrl?.match(/^\/@([^/]+)$/u)?.[1]?.toLowerCase();
  const channelId = CHANNEL_ID.test(owner?.browseId ?? "") ? owner.browseId : handle;
  if (!channelId) return null;

  return makeCandidate({
    platform: id, channelId, displayName, handle,
    entryId: renderer.videoId, url: `https://www.youtube.com/watch?v=${renderer.videoId}`, title
  });
}

function collect(node, page) {
  if (Array.isArray(node)) {
    for (const item of node) collect(item, page);
    return;
  }
  if (!node || typeof node !== "object") return;
  if (node.videoRenderer) {
    const candidate = candidateFromRenderer(node.videoRenderer);
    if (candidate) page.candidates.push(candidate);
    return;
  }
  if (node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
    page.complete = false;
    return;
  }
  for (const value of Object.values(node)) collect(value, page);
}

export function parseSearchPage(html) {
  const data = html.match(INITIAL_DATA)?.[1];
  const content = data && JSON.parse(data).contents;
  if (!content) throw new Error("Busca do YouTube indisponível");
  const page = { candidates: [], complete: true };
  collect(content, page);
  return page;
}

async function search(term, signal) {
  const url = new URL(SEARCH_URL);
  url.search = new URLSearchParams({ search_query: term, hl: "pt-BR", gl: "BR", sp: LIVE_FILTER });
  const response = await fetch(url, { credentials: "omit", signal });
  if (!response.ok) throw new Error(`YouTube retornou ${response.status}`);
  return parseSearchPage(await response.text());
}

export async function fetchLiveChannels() {
  const signal = AbortSignal.timeout(10000);
  const results = await Promise.allSettled(SEARCH_TERMS.map((term) => search(term, signal)));
  const successful = results.filter((result) => result.status === "fulfilled");
  if (!successful.length) throw new Error("Busca do YouTube indisponível");
  return {
    candidates: successful.flatMap((result) => result.value.candidates),
    complete: successful.length === results.length && successful.every((result) => result.value.complete)
  };
}

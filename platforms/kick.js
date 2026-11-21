import { isOtherGameOrReplay } from "../lib/brasil.js";
import { hasRegionSignals, regionProfile } from "../lib/regions.js";
import { makeCandidate } from "../lib/candidates.js";

const LISTING = "https://kick.com/stream/livestreams/en";
const CATEGORY_ID = 13155;
const CATEGORY_SLUG = "grand-theft-auto-vi";
const LOGIN = /^[a-z0-9][a-z0-9_-]{1,29}$/i;
const MAX_PAGES = 24;
const PARALLEL_PAGES = 4;

export const id = "kick";

function categoryMatches(category) {
  return Number(category?.id) === CATEGORY_ID || category?.slug === CATEGORY_SLUG;
}

export function candidatesFromStreams(streams, profile) {
  return streams.flatMap((stream) => {
    if (stream?.is_live !== true || !Array.isArray(stream.categories) || !stream.categories.some(categoryMatches)) return [];
    const user = stream.channel?.user;
    const login = stream.channel?.slug;
    if (!LOGIN.test(login ?? "")) return [];
    const title = String(stream.session_title ?? "");
    const displayName = user?.username || login;
    const tags = (Array.isArray(stream.tags) ? stream.tags : []).map((tag) => typeof tag === "string" ? tag : tag?.name);
    tags.push(user?.bio);
    if (isOtherGameOrReplay(title)) return [];

    return [makeCandidate({
      platform: id, channelId: login.toLowerCase(), displayName, handle: login,
      url: `https://kick.com/${login}`, title,
      regionalMatch: hasRegionSignals(profile, { language: stream.language, title, name: displayName, details: user?.bio, tags, country: user?.country })
    })];
  });
}

async function fetchPage(page, signal) {
  const url = new URL(LISTING);
  url.search = new URLSearchParams({ page, limit: 32, sort: "desc", subcategories: CATEGORY_SLUG });
  const response = await fetch(url, { headers: { Accept: "application/json" }, credentials: "omit", signal });
  if (!response.ok) throw new Error(`Kick retornou ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload?.data) || Number(payload.current_page) !== page) {
    throw new Error("Catálogo da Kick incompleto");
  }
  return { streams: payload.data, hasNext: Boolean(payload.next_page_url) };
}

export async function fetchLiveChannels({ region }) {
  const profile = regionProfile(region);
  const signal = AbortSignal.timeout(11000);
  const candidates = [];
  const first = await fetchPage(1, signal);
  candidates.push(...candidatesFromStreams(first.streams, profile));
  if (!first.hasNext) return { candidates, complete: true };

  let missing = false;
  for (let page = 2; page <= MAX_PAGES && !signal.aborted; page += PARALLEL_PAGES) {
    const count = Math.min(PARALLEL_PAGES, MAX_PAGES + 1 - page);
    const batch = await Promise.allSettled(
      Array.from({ length: count }, (_, index) => fetchPage(page + index, signal))
    );
    for (const result of batch) {
      if (result.status === "rejected") {
        missing = true;
        continue;
      }
      candidates.push(...candidatesFromStreams(result.value.streams, profile));
      if (!result.value.hasNext) return { candidates, complete: !missing };
    }
  }
  return { candidates, complete: false };
}

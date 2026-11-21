import { isOtherGameOrReplay } from "../lib/brasil.js";
import { hasRegionSignals, regionProfile, WORLD } from "../lib/regions.js";
import { makeCandidate } from "../lib/candidates.js";

const GQL_URL = "https://gql.twitch.tv/gql";
const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const DIRECTORY_QUERY_HASH = "86bcceb4e8b1a51256ff8eed8bd8aae4acacf80d737efe904f84f3aeadf8cafd";
const GAME = "grand-theft-auto-vi";
const LOGIN = /^[a-z0-9_]{3,25}$/i;

export const id = "twitch";

function directoryRequest(sort, language) {
  return [{
    operationName: "DirectoryPage_Game",
    variables: {
      imageWidth: 50,
      slug: GAME,
      options: {
        sort,
        recommendationsContext: { platform: "web" },
        requestID: "JIRA-VXP-2397",
        freeformTags: null,
        tags: [],
        broadcasterLanguages: language ? [language.toUpperCase()] : [],
        systemFilters: []
      },
      sortTypeIsRecency: false,
      limit: 100,
      includeCostreaming: true
    },
    extensions: { persistedQuery: { version: 1, sha256Hash: DIRECTORY_QUERY_HASH } }
  }];
}

export function candidatesFromEdges(edges, profile, language) {
  return edges.flatMap(({ node: stream }) => {
    const login = stream?.broadcaster?.login;
    if (!LOGIN.test(login ?? "") || stream?.game?.slug !== GAME || stream.type !== "live") return [];
    const title = String(stream.title ?? "");
    const displayName = stream.broadcaster.displayName || login;
    const tags = (Array.isArray(stream.freeformTags) ? stream.freeformTags : []).map((tag) => tag?.name);
    if (isOtherGameOrReplay(title)) return [];
    return [makeCandidate({
      platform: id, channelId: login.toLowerCase(), displayName, handle: login,
      url: `https://www.twitch.tv/${login}`, title,
      regionalMatch: hasRegionSignals(profile, { language, title, name: displayName, tags })
    })];
  });
}

async function fetchWindow(sort, language, signal) {
  const response = await fetch(GQL_URL, {
    method: "POST",
    headers: { "Client-Id": CLIENT_ID, "Content-Type": "text/plain;charset=UTF-8" },
    credentials: "omit",
    body: JSON.stringify(directoryRequest(sort, language)),
    signal
  });
  if (!response.ok) throw new Error(`Twitch retornou ${response.status}`);
  const [result] = await response.json();
  const streams = result?.data?.game?.streams;
  if (!Array.isArray(streams?.edges) || typeof streams.pageInfo?.hasNextPage !== "boolean") {
    throw new Error("Catálogo da Twitch indisponível");
  }
  return streams;
}

async function fetchDirectory(profile, language, signal) {
  const first = await fetchWindow("RELEVANCE", language, signal);
  const candidates = candidatesFromEdges(first.edges, profile, language);
  if (!first.pageInfo.hasNextPage) return { candidates, complete: true };

  // The public quick listing has a fixed window. Also ask for the lower-audience end.
  const tail = await fetchWindow("VIEWER_COUNT_ASC", language, signal).catch(() => null);
  if (tail) candidates.push(...candidatesFromEdges(tail.edges, profile, language));
  return { candidates, complete: tail?.pageInfo.hasNextPage === false };
}

export async function fetchLiveChannels({ region, mode }) {
  const profile = regionProfile(region);
  const signal = AbortSignal.timeout(9000);
  const languages = region === WORLD || !profile.language ? [null] : [profile.language, null];
  if (region === "BR" && mode === "only") languages.pop();

  const results = await Promise.allSettled(languages.map((language) => fetchDirectory(profile, language, signal)));
  const successful = results.filter((result) => result.status === "fulfilled");
  if (!successful.length) throw new Error("Catálogo da Twitch indisponível");
  return {
    candidates: successful.flatMap((result) => result.value.candidates),
    complete: successful.length === results.length && successful.every((result) => result.value.complete)
  };
}

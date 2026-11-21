const HOSTS = { twitch: "www.twitch.tv", youtube: "www.youtube.com", kick: "kick.com" };

function creatorKey(value) {
  return String(value ?? "").normalize("NFD").toLowerCase().replace(/\p{M}/gu, "");
}

export function makeCandidate({ platform, channelId, displayName, handle, entryId, url, title }) {
  const id = String(channelId ?? "").trim();
  if (!Object.hasOwn(HOSTS, platform) || !id) return null;
  if (!URL.canParse(url)) return null;
  const target = new URL(url);
  if (target.protocol !== "https:" || target.hostname !== HOSTS[platform]) return null;

  return { platform, channelId: id, displayName, handle, entryId: entryId || id, url: target.href, title };
}

function entryKey(candidate) {
  return `${candidate.platform}:${candidate.entryId}`;
}

export function dedupeCandidates(candidates) {
  return [...new Map(candidates.filter(Boolean).map((candidate) => [entryKey(candidate), candidate])).values()];
}

export function groupByIdentity(candidates, separateLives) {
  const groups = new Map();
  for (const candidate of candidates) {
    const handle = creatorKey(candidate.handle);
    const channelKey = candidate.platform + ":" + candidate.channelId;
    const key = separateLives ? entryKey(candidate) : handle.length < 4 ? channelKey : `creator:${handle}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }
  return groups;
}

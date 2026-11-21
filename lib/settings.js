export const DEFAULT_PLATFORMS = { twitch: true, youtube: true, kick: true };
export const DEFAULT_SETTINGS = { platforms: DEFAULT_PLATFORMS, separateLives: true };
export const PLATFORM_LABELS = { twitch: "Twitch", youtube: "YouTube", kick: "Kick" };

export function normalizePlatforms(platforms) {
  return Object.fromEntries(
    Object.keys(DEFAULT_PLATFORMS).map((id) => [id, platforms?.[id] !== false])
  );
}

export function enabledPlatformIds(platforms) {
  return Object.keys(DEFAULT_PLATFORMS).filter((id) => platforms[id]);
}

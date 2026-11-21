import { INTERFACE_LANGUAGES, normalizeInterfaceLanguage, SYSTEM_LANGUAGE, translateInterface } from "./lib/i18n.js";
import { getStorage, setStorage } from "./lib/storage.js";
import { readCycle } from "./lib/cycle.js";
import { normalizeRegionMode, readRegionSelection, regionOptions, WORLD } from "./lib/regions.js";
import { DEFAULT_SETTINGS, PLATFORM_LABELS, normalizePlatforms } from "./lib/settings.js";

const inputs = Object.fromEntries(Object.keys(PLATFORM_LABELS).map((id) => [id, document.querySelector("#platform-" + id)]));
const separate = document.querySelector("#separate-lives");
const region = document.querySelector("#region");
const regionMode = document.querySelector("#region-mode");
const regionStatus = document.querySelector("#region-status");
const regionModeHint = document.querySelector("#region-mode-hint");
const language = document.querySelector("#interface-language");
const languageStatus = document.querySelector("#language-status");
const reset = document.querySelector("#reset-cycle");
const platformsStatus = document.querySelector("#platforms-status");
const separateStatus = document.querySelector("#separate-status");
const resetStatus = document.querySelector("#reset-status");
const summary = document.querySelector("#cycle-summary");
const discovery = document.querySelector("#discovery-status");
const art = document.querySelector("#hero-art");
const artCredit = document.querySelector("#art-credit");

let ui;

function renderLanguage(choice) {
  const localization = translateInterface(choice);
  if (ui?.locale !== localization.locale) {
    ui = localization;
    document.documentElement.lang = ui.locale;
    for (const node of document.querySelectorAll("[data-i18n]")) {
      node.textContent = ui.t(node.dataset.i18n);
    }
    language.replaceChildren(
      new Option(ui.t("automatic"), SYSTEM_LANGUAGE),
      ...Object.entries(INTERFACE_LANGUAGES).map(([code, label]) => new Option(label, code))
    );
    region.replaceChildren(
      ...regionOptions(ui.locale, ui.t("world")).map(([code, label]) => new Option(label, code))
    );
    for (const status of [languageStatus, platformsStatus, regionStatus, separateStatus, resetStatus]) {
      status.textContent = "";
    }
  }
  language.value = normalizeInterfaceLanguage(choice);
}

function hideFailedArt() {
  art.hidden = true;
  artCredit.hidden = true;
}
art.addEventListener("error", hideFailedArt);
if (art.complete && !art.naturalWidth) hideFailedArt();

function renderRegionHint(selection) {
  regionMode.disabled = selection.region === WORLD;
  const keys = { all: "hintWorld", prefer: "hintPrefer", only: "hintOnly" };
  regionModeHint.textContent = ui.t(keys[selection.mode]);
}

function renderDiscovery(report, platforms, selection) {
  const previous = readRegionSelection({ region: report?.region, regionMode: report?.mode });
  if (previous.region !== selection.region || previous.mode !== selection.mode) {
    discovery.hidden = true;
    return;
  }
  const details = Object.entries(report?.sources ?? {}).flatMap(([id, source]) => {
    if (!platforms[id] || !Object.hasOwn(PLATFORM_LABELS, id)) return [];
    const label = PLATFORM_LABELS[id];
    if (source.state === "unavailable") return [ui.t("sourceUnavailable", { source: label })];
    const partial = source.state === "partial" ? ui.t("sourcePartial") : "";
    const regional = selection.mode === "prefer"
      ? ui.t("sourceRegional", { count: ui.number(source.regional ?? 0) })
      : "";
    return [label + " " + ui.number(source.count) + regional + partial];
  });
  discovery.hidden = !details.length;
  discovery.textContent = details.length ? ui.t("lastSearch", { results: details.join(" · ") }) : "";
}

async function refresh() {
  const settings = await getStorage({ ...DEFAULT_SETTINGS, cycles: {}, lastDiscovery: null });
  renderLanguage(settings.interfaceLanguage);
  const platforms = normalizePlatforms(settings.platforms);
  const separateLives = settings.separateLives !== false;
  for (const [id, input] of Object.entries(inputs)) input.checked = platforms[id];
  separate.checked = separateLives;

  const selection = { ...readRegionSelection(settings), separateLives };
  region.value = selection.region;
  regionMode.value = normalizeRegionMode(settings.regionMode);
  renderRegionHint(selection);
  const count = readCycle(settings.cycles, selection).seen.length;
  const summaryKey = count ? (separateLives ? "roundStreams" : "roundCreators") : "roundEmpty";
  summary.textContent = ui.t(summaryKey, { count: ui.number(count) });
  renderDiscovery(settings.lastDiscovery, platforms, selection);
}

language.addEventListener("change", async () => {
  try {
    await setStorage({ interfaceLanguage: normalizeInterfaceLanguage(language.value) });
    await refresh();
    languageStatus.textContent = ui.t("languageSaved");
  } catch {
    await refresh().catch(() => {});
    languageStatus.textContent = ui.t("languageError");
  }
});

for (const input of Object.values(inputs)) {
  input.addEventListener("change", async () => {
    const platforms = Object.fromEntries(Object.entries(inputs).map(([id, control]) => [id, control.checked]));
    const active = Object.keys(platforms).filter((id) => platforms[id]);
    if (!active.length) {
      input.checked = true;
      platformsStatus.textContent = ui.t("platformRequired");
      return;
    }

    try {
      await setStorage({ platforms });
      platformsStatus.textContent = ui.t("platformsSaved", { platforms: ui.list(active.map((id) => PLATFORM_LABELS[id])) });
    } catch {
      platformsStatus.textContent = ui.t("platformsError");
      await refresh().catch(() => {});
    }
  });
}

separate.addEventListener("change", async () => {
  try {
    await setStorage({ separateLives: separate.checked });
    separateStatus.textContent = ui.t(separate.checked ? "separateOn" : "separateOff");
  } catch {
    separateStatus.textContent = ui.t("separateError");
    await refresh().catch(() => {});
  }
});

async function saveRegion() {
  const settings = { region: region.value, regionMode: regionMode.value };
  renderRegionHint(readRegionSelection(settings));
  try {
    await setStorage(settings);
    regionStatus.textContent = ui.t("regionSaved");
  } catch {
    regionStatus.textContent = ui.t("regionError");
    await refresh().catch(() => {});
  }
}

region.addEventListener("change", saveRegion);
regionMode.addEventListener("change", saveRegion);

reset.addEventListener("click", async () => {
  reset.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({
      type: "reset-round",
      region: region.value,
      regionMode: regionMode.value,
      separateLives: separate.checked
    });
    if (!response?.ok) throw new Error("Round reset failed");
    resetStatus.textContent = ui.t("resetSaved");
  } catch {
    resetStatus.textContent = ui.t("resetError");
  } finally {
    reset.disabled = false;
  }
});

function loadSettings() {
  refresh().catch(() => { summary.textContent = ui.t("loadError"); });
}

renderLanguage(SYSTEM_LANGUAGE);
summary.textContent = ui.t("roundLoading");
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "local") loadSettings();
});
loadSettings();

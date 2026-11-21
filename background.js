import * as twitch from "./platforms/twitch.js";
import * as youtube from "./platforms/youtube.js";
import * as kick from "./platforms/kick.js";
import { drawAndOpen, resetCycle } from "./lib/cycle.js";
import { collectCandidates, readSettings } from "./lib/orchestrator.js";
import { readRegionSelection } from "./lib/regions.js";
import { translateInterface } from "./lib/i18n.js";
import { getStorage, setStorage } from "./lib/storage.js";

const ADAPTERS = [twitch, youtube, kick];
let drawing = false;

async function setBadge(text, title) {
  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ color: "#a52b62" }),
    chrome.action.setBadgeText({ text }),
    chrome.action.setTitle({ title })
  ]);
}

async function readInterface() {
  const { interfaceLanguage } = await getStorage({ interfaceLanguage: "auto" });
  return translateInterface(interfaceLanguage);
}

async function updateActionTitle() {
  const ui = await readInterface();
  await chrome.action.setTitle({ title: ui.t("actionTitle") });
}

async function openRandomLive() {
  if (drawing) return;
  drawing = true;
  let ui = translateInterface();
  try {
    ui = await readInterface();
    await setBadge("…", ui.t("actionSearching"));
    const selection = await readSettings();
    const { platformIds, region, mode } = selection;
    if (!platformIds.length) {
      await setBadge("!", ui.t("actionPlatforms"));
      return;
    }

    const { candidates, sources } = await collectCandidates(ADAPTERS, platformIds, selection);
    await setStorage({ lastDiscovery: { at: Date.now(), region, mode, sources } });
    const chosen = await drawAndOpen(candidates, selection, (url) => chrome.tabs.create({ url }));
    const unavailable = Object.values(sources).some((source) => source.state === "unavailable");
    if (unavailable || (!chosen && Object.values(sources).some((source) => source.state === "partial"))) {
      await setBadge("!", ui.t("actionPartial"));
    } else if (!chosen) {
      await setBadge("0", ui.t("actionEmpty"));
    } else {
      await setBadge("", ui.t("actionTitle"));
    }
  } catch (error) {
    console.warn("SMB Live GTA VI", error);
    await setBadge("!", ui.t("actionError"));
  } finally {
    drawing = false;
  }
}

chrome.action.onClicked.addListener(openRandomLive);

function refreshActionTitle() {
  if (!drawing) updateActionTitle().catch(console.warn);
}
chrome.runtime.onInstalled.addListener(refreshActionTitle);
chrome.runtime.onStartup.addListener(refreshActionTitle);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.interfaceLanguage) refreshActionTitle();
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.url !== chrome.runtime.getURL("options.html") || message?.type !== "reset-round") return false;
  resetCycle({ ...readRegionSelection(message), separateLives: message.separateLives !== false }).then(
    () => respond({ ok: true }),
    () => respond({ ok: false })
  );
  return true;
});

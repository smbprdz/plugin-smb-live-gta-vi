import * as twitch from "./platforms/twitch.js";
import * as youtube from "./platforms/youtube.js";
import * as kick from "./platforms/kick.js";
import { drawAndOpen, resetCycle } from "./lib/cycle.js";
import { collectCandidates, readSettings } from "./lib/orchestrator.js";
import { setStorage } from "./lib/storage.js";

const ADAPTERS = [twitch, youtube, kick];
const ACTION_TITLE = "Sortear live BR de GTA VI";
let drawing = false;

async function setBadge(text, title = ACTION_TITLE) {
  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ color: "#a52b62" }),
    chrome.action.setBadgeText({ text }),
    chrome.action.setTitle({ title })
  ]);
}

async function openRandomLive() {
  if (drawing) return;
  drawing = true;
  try {
    await setBadge("…", "Buscando lives BR de GTA VI");
    const { platformIds, separateLives } = await readSettings();
    if (!platformIds.length) {
      await setBadge("!", "Ative uma plataforma nas Opções.");
      return;
    }

    const { candidates, sources } = await collectCandidates(ADAPTERS, platformIds);
    await setStorage({ lastDiscovery: { at: Date.now(), sources } });
    const chosen = await drawAndOpen(candidates, separateLives, (url) => chrome.tabs.create({ url }));
    const unavailable = Object.values(sources).some((source) => source.state === "unavailable");
    if (unavailable || (!chosen && Object.values(sources).some((source) => source.state === "partial"))) {
      await setBadge("!", "Consulta parcial. Veja os detalhes nas Opções.");
    } else if (!chosen) {
      await setBadge("0", "Nenhuma live BR de GTA VI encontrada agora.");
    } else {
      await setBadge("");
    }
  } catch (error) {
    console.warn("SMB Live GTA VI", error);
    await setBadge("!", "O sorteio falhou. Clique novamente para tentar.");
  } finally {
    drawing = false;
  }
}

chrome.action.onClicked.addListener(openRandomLive);

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.url !== chrome.runtime.getURL("options.html") || message?.type !== "reset-round") return false;
  resetCycle(message.separateLives !== false).then(
    () => respond({ ok: true }),
    () => respond({ ok: false })
  );
  return true;
});

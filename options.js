import { getStorage, setStorage } from "./lib/storage.js";
import { readCycle } from "./lib/cycle.js";
import { DEFAULT_SETTINGS, PLATFORM_LABELS, normalizePlatforms } from "./lib/settings.js";

const inputs = Object.fromEntries(Object.keys(PLATFORM_LABELS).map((id) => [id, document.querySelector("#platform-" + id)]));
const separate = document.querySelector("#separate-lives");
const reset = document.querySelector("#reset-cycle");
const platformsStatus = document.querySelector("#platforms-status");
const separateStatus = document.querySelector("#separate-status");
const resetStatus = document.querySelector("#reset-status");
const summary = document.querySelector("#cycle-summary");
const discovery = document.querySelector("#discovery-status");
const art = document.querySelector("#hero-art");
const artCredit = document.querySelector("#art-credit");

function hideFailedArt() {
  art.hidden = true;
  artCredit.hidden = true;
}
art.addEventListener("error", hideFailedArt);
if (art.complete && !art.naturalWidth) hideFailedArt();

function renderDiscovery(report, platforms) {
  const details = Object.entries(report?.sources ?? {}).flatMap(([id, source]) => {
    if (!platforms[id] || !Object.hasOwn(PLATFORM_LABELS, id)) return [];
    const label = PLATFORM_LABELS[id];
    if (source.state === "unavailable") return [label + " indisponível"];
    const partial = source.state === "partial" ? " (consulta parcial)" : "";
    return [label + " " + source.count + partial];
  });
  discovery.hidden = !details.length;
  discovery.textContent = details.length ? "Última busca: " + details.join(" · ") : "";
}

async function refresh() {
  const settings = await getStorage({ ...DEFAULT_SETTINGS, cycles: {}, lastDiscovery: null });
  const platforms = normalizePlatforms(settings.platforms);
  const separateLives = settings.separateLives !== false;
  for (const [id, input] of Object.entries(inputs)) input.checked = platforms[id];
  separate.checked = separateLives;

  const count = readCycle(settings.cycles, separateLives).seen.length;
  const drawn = separateLives
    ? (count === 1 ? "transmissão já sorteada" : "transmissões já sorteadas")
    : (count === 1 ? "criador já sorteado" : "criadores já sorteados");
  summary.textContent = count ? count + " " + drawn + " nesta rodada." : "Rodada nova. Nenhuma live sorteada ainda.";
  renderDiscovery(settings.lastDiscovery, platforms);
}

for (const input of Object.values(inputs)) {
  input.addEventListener("change", async () => {
    const platforms = Object.fromEntries(Object.entries(inputs).map(([id, control]) => [id, control.checked]));
    const active = Object.keys(platforms).filter((id) => platforms[id]);
    if (!active.length) {
      input.checked = true;
      platformsStatus.textContent = "Deixe pelo menos uma plataforma ligada.";
      return;
    }

    try {
      await setStorage({ platforms });
      platformsStatus.textContent = "Sorteando entre " + active.map((id) => PLATFORM_LABELS[id]).join(", ") + ".";
    } catch {
      platformsStatus.textContent = "Falha ao salvar as plataformas.";
      await refresh().catch(() => {});
    }
  });
}

separate.addEventListener("change", async () => {
  try {
    await setStorage({ separateLives: separate.checked });
    separateStatus.textContent = separate.checked
      ? "Cada transmissão entra separadamente."
      : "Canais com nomes semelhantes ocupam uma vaga só.";
  } catch {
    separateStatus.textContent = "Falha ao salvar o modo de sorteio.";
    await refresh().catch(() => {});
  }
});

reset.addEventListener("click", async () => {
  reset.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: "reset-round", separateLives: separate.checked });
    if (!response?.ok) throw new Error("Falha ao reiniciar");
    resetStatus.textContent = "Rodada reiniciada.";
  } catch {
    resetStatus.textContent = "Falha ao reiniciar a rodada.";
  } finally {
    reset.disabled = false;
  }
});

function loadSettings() {
  refresh().catch(() => { summary.textContent = "Falha ao carregar a rodada."; });
}
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "local") loadSettings();
});
loadSettings();

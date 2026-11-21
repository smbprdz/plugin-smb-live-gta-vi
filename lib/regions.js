import { isBrazilianAudience } from "./brasil.js";

export const WORLD = "ALL";
export const DEFAULT_REGION = "BR";
export const DEFAULT_REGION_MODE = "only";

// ISO 3166-1 alpha-2. Names come from the browser's locale data.
const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ " +
  "NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ " +
  "TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");
const CODES = new Set(COUNTRY_CODES);
const LABELS = new Intl.DisplayNames(["pt-BR"], { type: "region" });
const COMMON_LANGUAGES = {
  ar: "AE BH DZ EG IQ JO KW LB LY MA OM PS QA SA SD SY TN YE",
  de: "AT DE LI",
  en: "AU CA GB IE JM MT NZ SG US ZA",
  es: "AR BO CL CO CR CU DO EC ES GT HN MX NI PA PE PR PY SV UY VE",
  fr: "CD CG CI FR GA MC SN",
  it: "IT SM VA",
  nl: "NL",
  pt: "AO BR CV GW MZ PT ST TL",
  ru: "BY RU",
  zh: "CN HK MO TW",
  bn: "BD", cs: "CZ", da: "DK", el: "CY GR", fi: "FI", he: "IL", hi: "IN",
  hu: "HU", id: "ID", ja: "JP", ko: "KR", ms: "MY", no: "NO", pl: "PL",
  ro: "RO", sk: "SK", sv: "SE", th: "TH", tr: "TR", uk: "UA", vi: "VN"
};
const LANGUAGES = Object.fromEntries(
  Object.entries(COMMON_LANGUAGES).flatMap(([language, regions]) => regions.split(" ").map((code) => [code, language]))
);
const ALIASES = {
  BR: ["Brazil", "Brasil"],
  CN: ["China", "中国"],
  DE: ["Deutschland"],
  ES: ["España"],
  GB: ["United Kingdom", "Great Britain", "UK", "Reino Unido"],
  JP: ["Japan", "日本"],
  KR: ["South Korea", "대한민국", "한국"],
  PT: ["Portugal", "PT-PT", "Português europeu"],
  TW: ["Taiwan", "台灣", "台湾"],
  US: ["USA", "United States", "United States of America", "Estados Unidos"]
};

export function regionOptions() {
  const remaining = COUNTRY_CODES.filter((code) => code !== DEFAULT_REGION)
    .map((code) => [code, LABELS.of(code)])
    .sort((first, second) => first[1].localeCompare(second[1], "pt-BR"));
  return [[WORLD, "Todas as regiões"], [DEFAULT_REGION, LABELS.of(DEFAULT_REGION)], ...remaining];
}

export function normalizeRegion(value) {
  const code = typeof value === "string" ? value.toUpperCase() : DEFAULT_REGION;
  return code === WORLD || CODES.has(code) ? code : DEFAULT_REGION;
}

export function normalizeRegionMode(value) {
  return value === "prefer" ? "prefer" : DEFAULT_REGION_MODE;
}

export function readRegionSelection(settings) {
  const region = normalizeRegion(settings.region);
  const mode = region === WORLD ? "all" : normalizeRegionMode(settings.regionMode);
  return { region, mode };
}

function plain(value) {
  return String(value ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function regionFlag(code) {
  return String.fromCodePoint(...Array.from(code, (char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

export function regionProfile(region) {
  if (region === WORLD) return { region, language: null, locale: "en" };
  const language = LANGUAGES[region] ?? null;
  const locale = region === "BR" || region === "PT" ? "pt-" + region : (language ?? "en");
  const list = new Set(["pt-BR", "en", "es", locale]);
  const names = [...list].map((tag) => new Intl.DisplayNames([tag], { type: "region" }).of(region));
  names.push(...(ALIASES[region] ?? []));
  return { region, language, locale, labels: new Set(names.map(plain)), flag: regionFlag(region) };
}

function matchesLocale(value, region) {
  const match = String(value ?? "").trim().match(/^[a-z]{2,3}(?:-[a-z]{4})?[-_]([a-z]{2})$/i);
  return match?.[1].toUpperCase() === region;
}

export function hasRegionSignals(profile, { country, language, title = "", name = "", details = "", tags = [] }) {
  const { region, labels, flag } = profile;
  if (region === WORLD) return false;
  const declared = String(country ?? "").trim().toUpperCase();
  if (CODES.has(declared)) return declared === region;
  if (labels.has(plain(country)) || matchesLocale(language, region)) return true;

  const descriptors = [title, name, details];
  if ([...descriptors, ...tags].some((value) => String(value ?? "").includes(flag))) return true;
  if (tags.some((tag) => labels.has(plain(tag)) || plain(tag) === region.toLowerCase() || matchesLocale(tag, region))) return true;

  const text = descriptors.map(plain).join(" | ");
  for (const label of labels) {
    if (label.length < 3) continue;
    const escaped = label.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&");
    const association = new RegExp(
      "(?:^|[^\\p{L}\\p{N}])(?:de |do |da |desde |from |in |en |em |pais[: ]+|country[: ]+)" +
      escaped + "(?=$|[^\\p{L}\\p{N}])",
      "u"
    );
    if (association.test(text)) return true;
  }

  if (region === "BR") return isBrazilianAudience({ language, title, name, tags: [...tags, details], country });
  if (region === "PT") {
    const declaredLanguage = plain(language);
    const portuguese = !declaredLanguage || /^(?:pt|portugues|portuguese)$/.test(declaredLanguage);
    return portuguese && /\b(?:portugues europeu|pt[-_ ]pt|a jogar|em direc?to|malta portuguesa)\b/i.test(text) &&
      !isBrazilianAudience({ title, name, tags, country });
  }
  return false;
}

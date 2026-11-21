import english from "./locales/en.js";
import brazilPortuguese from "./locales/pt-BR.js";
import portugalPortuguese from "./locales/pt-PT.js";
import spanish from "./locales/es.js";
import french from "./locales/fr.js";
import german from "./locales/de.js";
import italian from "./locales/it.js";
import japanese from "./locales/ja.js";
import korean from "./locales/ko.js";
import simplifiedChinese from "./locales/zh-CN.js";
import traditionalChinese from "./locales/zh-TW.js";
import russian from "./locales/ru.js";

export const SYSTEM_LANGUAGE = "auto";
export const INTERFACE_LANGUAGES = Object.freeze({
  "en": "English",
  "pt-BR": "Português (Brasil)",
  "pt-PT": "Português (Portugal)",
  "es": "Español",
  "fr": "Français",
  "de": "Deutsch",
  "it": "Italiano",
  "ja": "日本語",
  "ko": "한국어",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  "ru": "Русский"
});

const MESSAGES = {
  "en": english,
  "pt-BR": brazilPortuguese,
  "pt-PT": portugalPortuguese,
  "es": spanish,
  "fr": french,
  "de": german,
  "it": italian,
  "ja": japanese,
  "ko": korean,
  "zh-CN": simplifiedChinese,
  "zh-TW": traditionalChinese,
  "ru": russian
};

export function normalizeInterfaceLanguage(choice) {
  return typeof choice === "string" && Object.hasOwn(MESSAGES, choice) ? choice : SYSTEM_LANGUAGE;
}

export function resolveInterfaceLanguage(choice, browserLanguage) {
  const selected = normalizeInterfaceLanguage(choice);
  if (selected !== SYSTEM_LANGUAGE) return selected;

  const [primary, ...subtags] = String(browserLanguage ?? "").toLowerCase().split(/[-_]/);
  if (primary === "pt") return subtags.includes("pt") ? "pt-PT" : "pt-BR";
  if (primary === "zh") {
    return subtags.some((part) => ["hant", "tw", "hk", "mo"].includes(part)) ? "zh-TW" : "zh-CN";
  }
  return Object.hasOwn(MESSAGES, primary) ? primary : "en";
}

export function translateInterface(choice, browserLanguage = globalThis.chrome?.i18n?.getUILanguage?.()) {
  const locale = resolveInterfaceLanguage(choice, browserLanguage);
  const number = new Intl.NumberFormat(locale);
  const list = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
  return {
    locale,
    number: (value) => number.format(value),
    list: (items) => list.format(items),
    t(key, values = {}) {
      const template = MESSAGES[locale][key] ?? MESSAGES.en[key];
      return template.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
    }
  };
}

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { INTERFACE_LANGUAGES, normalizeInterfaceLanguage, translateInterface } from "../lib/i18n.js";
import { regionOptions } from "../lib/regions.js";

test("uses the browser locale in automatic mode and supports an explicit override", () => {
  for (const [browser, expected] of [
    ["pt_BR", "pt-BR"], ["pt-PT", "pt-PT"], ["es-419", "es"],
    ["zh-Hant-HK", "zh-TW"], ["zh-SG", "zh-CN"], ["ja-JP", "ja"], ["sv-SE", "en"]
  ]) assert.equal(translateInterface("auto", browser).locale, expected);
  assert.equal(translateInterface("it", "en-US").locale, "it");
  assert.equal(normalizeInterfaceLanguage("__proto__"), "auto");
});

test("every language covers the same keys and keeps placeholders", async () => {
  const { default: english } = await import("../lib/locales/en.js");
  const tokens = (text) => [...text.matchAll(/\{\w+\}/g)].map((match) => match[0]).sort();
  const keys = Object.keys(english).sort();
  for (const code of Object.keys(INTERFACE_LANGUAGES)) {
    const { default: messages } = await import("../lib/locales/" + code + ".js");
    assert.deepEqual(Object.keys(messages).sort(), keys, code);
    for (const key of keys) {
      assert.ok(messages[key].trim(), code + " " + key);
      assert.deepEqual(tokens(messages[key]), tokens(english[key]), code + " " + key);
    }
  }
  const html = await readFile(new URL("../options.html", import.meta.url), "utf8");
  for (const [, key] of html.matchAll(/data-i18n="(\w+)"/g)) assert.ok(keys.includes(key), key);
});

test("translates region labels and totals while keeping geographic identifiers", () => {
  const english = translateInterface("en");
  const french = translateInterface("fr");
  const enRegions = new Map(regionOptions(english.locale, english.t("world")));
  const frRegions = new Map(regionOptions(french.locale, french.t("world")));
  assert.equal(enRegions.size, 250);
  assert.equal(frRegions.get("ALL"), "Toutes les régions");
  assert.equal(enRegions.get("BR"), "Brazil");
  assert.equal(frRegions.get("BR"), "Brésil");
  assert.match(english.t("roundStreams", { count: english.number(1234) }), /1,234/);
});

const GTA_VI = /\b(?:gta|grand[ -]+theft[ -]+auto)[\s.:_-]*(?:vi|6)(?![\p{L}\p{N}])/iu;
const OTHER_GAME = /\b(?:gta|grand[ -]+theft[ -]+auto)[\s.:_-]*(?:online|v|5)(?![\p{L}\p{N}])|\b(?:fivem|gta\s*rp|mta\s*rp)\b/iu;
const NON_GAMEPLAY = /\b(?:fake|modificado|fan[\s-]*made|trailer|rumor|leak|vazamento|contagem regressiva|countdown|podcast|reprise|replay|gravado|pre[\s-]*gravado|rebroadcast|restream|loop)\b/i;
const OTHER_LOCALE = /\b(?:pt[\s_-]*pt|portugues europeu|portugal|angola|mocambique|guine-bissau|cabo verde|timor-leste|lisboa|madeira|acores|portuguese from portugal|de portugal|em portugal|premios? em euros?|a jogar|a zerar|vamos la jogar|telemovel|putos|malta|bora la|directo)\b|€/i;
const BRAZIL = /\b(?:pt[\s_-]*br|brazil(?:ian)?|brasil(?:eir[oa]s?)?|brazuca|brpt|portugues do brasil|primeir[oa] br|[a-z0-9]+ brasileiro)\b|🇧🇷|(?:^|\s)br(?:$|\s)|r\$/i;
const BR_USAGE = /\b(?:pix(?:athon)?|baian[oa]|carioc[ao]|nordestin[oa]|nordeste|paulist[ao]|papai|mae|lojinha|lisinho|resenha|zer(?:ar|ando|ei|amos)|palavrao|jogando|gameplay dublado|dublad[oa]|dublagem|meu mano|minha tropa|bora de|bora jogar|[mt]ao on|ta on|to ao vivo|vamos de|pro chat|p chat|pros inscritos|ae galera|fala galera|fala tropa|salve galera|feriado|sorteio|detonado|vem com a gente|brabo|daora|arretado|cacador paranormal|vai dar bom|reage ai|reacts e|vamos zerar|bem vind[oa]s|vem pra live|horinhas|direto do brasil)\b/i;
const PT_USAGE = /\b(?:ao vivo|em portugues|primeira vez|come[cç](?:ando|amos)|chegou|voltamos|ate o fim|ate o final|ate terminar|a nossa saga|nao vou|terceiro dia|exploracao|missoes|junto comigo|hoje|manha|amanha|continuando|jogo completo|modo historia|parte \d+|dia \d+|vai comecar|galera|nosso|voce|vamos|encerrou)\b/i;

function plain(value) {
  return String(value ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function isBrazilianAudience({ language, title, name, tags = [], country }) {
  const locale = plain(language).trim();
  const region = plain(country).trim();
  const signals = plain([title, name, ...tags].filter(Boolean).join(" "));
  const nativeBrazil = /^(?:pt[\s_-]*br|brazilian portuguese|portuguese\s*\(brazil\))$/.test(locale);
  const genericPortuguese = /^(?:pt|portugues|portuguese)$/.test(locale);
  if (locale && !nativeBrazil && !genericPortuguese) return false;
  if (/^(?:pt|pt-pt|prt|portugal|ao|angola|mz|mocambique)$/.test(region) || OTHER_LOCALE.test(signals)) return false;
  if (nativeBrazil || /^(?:br|bra|brasil|brazil)$/.test(region) || BRAZIL.test(signals)) return true;

  const brazilianFormat = /\bao vivo\b/.test(signals) &&
    PT_USAGE.test(signals.replace(/\bao vivo\b/g, ""));
  return BR_USAGE.test(signals) || brazilianFormat;
}

export function isGtaViGameplay(title) {
  return GTA_VI.test(title) && !OTHER_GAME.test(title) && !NON_GAMEPLAY.test(plain(title));
}

export function isOtherGameOrReplay(title) {
  const text = plain(title);
  return (OTHER_GAME.test(text) && !GTA_VI.test(text)) || NON_GAMEPLAY.test(text);
}

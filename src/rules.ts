// The rules, in the order they apply. Sources: the Office québécois de la langue française's Banque de dépannage
// linguistique, "Espacement avant et après les signes de ponctuation et les symboles" (22039), "Contextes exigeant une
// espace insécable" (24566), "Écriture des heures" (21516), "Écriture des sommes d'argent" (21584), "Écriture des
// symboles d'unités de mesure" (21401) and "Espacements dans les nombres" (25447). fr-FR differs in one place: a narrow
// no-break space before ; ! ? and between digit groups.
//
// Every rule only changes spaces and marks next to what it targets, and none touches U+E000 (a protected range, see
// mask.ts). Running the rules twice gives the same text.

import type { Resolved } from "./options.js";

export const NBSP = " ";
export const NNBSP = " ";

/** A space that may be replaced: never a line break. */
const S = "[ \\t\\u00a0\\u202f]";
const SYMBOL = "(?:[$¢€£%‰]|°[CF]|[MGk]\\$)";

export interface Rule {
  id: string;
  message: string;
  re: RegExp;
  to: (match: string, ...groups: (string | undefined)[]) => string;
}

export function rules(o: Resolved): Rule[] {
  const high = o.highPunctuation === "narrow" ? NNBSP : "";
  const group = o.locale === "fr-FR" ? NNBSP : NBSP;
  const list: (Rule | false)[] = [
    o.apostrophes && {
      id: "apostrophe",
      message: "Use the typographic apostrophe: l’été, not l'été.",
      re: /(?<=\p{L})'(?=\p{L})/gu,
      to: () => "’",
    },
    o.ellipsis && {
      id: "ellipsis",
      message: "Use one ellipsis character (…) instead of three dots.",
      re: /(?<!\.)\.{3}(?!\.)/g,
      to: () => "…",
    },
    o.quotes && {
      id: "quotes",
      message: "Use French quotation marks: « texte », not \"texte\".",
      re: /"([^"\n]*?)"/g,
      to: (m, inner = "") => (inner.trim() ? `«${NBSP}${inner.trim()}${NBSP}»` : m),
    },
    o.ordinals && {
      id: "ordinal",
      message: "Write ordinals 2e, 3e (not 2ème, 3ième), 1er and 1re.",
      re: /(?<![\p{L}\p{N}])(\d+)(?:ième|ieme|ème|eme)(s?)(?!\p{L})|(?<![\p{L}\p{N}])1(?:ère|ere)(s?)(?!\p{L})|(?<![\p{L}\p{N}])1ier(s?)(?!\p{L})/gu,
      to: (m, n, s1, s2, s3) => (n ? (n === "1" ? m : `${n}e${s1 ?? ""}`) : s2 !== undefined ? `1re${s2}` : `1er${s3 ?? ""}`),
    },
    o.dollarAfter && {
      id: "dollar-after",
      message: "The dollar sign follows the amount: 29 $, not $29.",
      re: /(?<![\p{L}\p{N}])\$[ \t ]?(\d{1,3}(?:[   ]\d{3})+|\d+)(,\d{2})?(?![\p{N}.,])/gu,
      to: (_m, n = "", d = "") => `${n}${d}${NBSP}$`,
    },
    o.hours && {
      id: "hour",
      message: "Write the hour with the symbol h and no-break spaces: 8 h 30, 22 h.",
      re: new RegExp(`(?<![\\p{L}\\p{N},.:])(\\d{1,2})${S}?[hH](?:${S}?([0-5]\\d))?(?![\\p{L}\\p{N}])`, "gu"),
      to: (_m, h = "", min) => `${h}${NBSP}h${min ? NBSP + min : ""}`,
    },
    o.colonHours && {
      id: "colon-hour",
      message: "In running text, write the hour with h: 8 h 30, not 8:30.",
      re: /(?<![\p{N}:.,])([01]?\d|2[0-3]):([0-5]\d)(?![\p{N}:])/gu,
      to: (_m, h = "", min = "") => `${h}${NBSP}h${NBSP}${min}`,
    },
    {
      id: "symbol",
      message: "Put a no-break space between a number and its symbol: 29 $, 15 %, 20 °C.",
      re: new RegExp(`(?<=\\p{N})[ \\t\\u202f]*(?=${SYMBOL}(?!\\p{L}))`, "gu"),
      to: () => NBSP,
    },
    {
      id: "amount-groups",
      message: "Group an amount's digits by three: 12 535 $, not 12535 $.",
      // A whole number only: not the tail of "1 23456", and not after a decimal point or comma.
      re: new RegExp(`(?<![\\p{N},.])(?<!\\p{N}[ \\u00a0\\u202f])(\\d{${o.groupFourDigits ? 4 : 5},})(?=(?:,\\d+)?\\u00a0${SYMBOL})`, "gu"),
      to: (_m, n = "") => n.replace(/\B(?=(\d{3})+(?!\d))/g, group),
    },
    {
      id: "digit-groups",
      message: `Digit groups are joined by a${o.locale === "fr-FR" ? " narrow" : ""} no-break space: 1 490, 3 000.`,
      re: /(?<=\p{N})[ \t  ](?=\d{3}(?!\p{N}))/gu,
      to: () => group,
    },
    {
      id: "guillemet-open",
      message: "Put a no-break space after «.",
      re: /«[ \t  ]*(?!\n)/g,
      to: () => `«${NBSP}`,
    },
    {
      id: "guillemet-close",
      message: "Put a no-break space before ».",
      re: /(?<=[^\s])[ \t  ]*»|(?<=)[ \t  ]+»/gu,
      to: () => `${NBSP}»`,
    },
    {
      id: "colon",
      message: "Put a no-break space before the colon: Note : texte.",
      re: /(?<=[^\s:])[ \t  ]*:(?=[ \t \r]|$)/gmu,
      to: () => `${NBSP}:`,
    },
    {
      id: "high-punctuation",
      message:
        o.highPunctuation === "narrow"
          ? "Put a narrow no-break space before ; ! and ?."
          : "No space before ; ! and ? (Office québécois de la langue française).",
      re: o.highPunctuation === "narrow"
        ? /(?<=[^\s«(\[;!?])[ \t  ]*(?=[;!?])/gu
        : /(?<=[^\s«(\[;!?])[ \t  ]+(?=[;!?])/gu,
      to: () => high,
    },
    {
      id: "space-before-comma",
      message: "No space before a comma or a period.",
      // A period counts only when a space or the end follows it: ".zip" in "en .zip" is a file type.
      re: /(?<=[\p{L}\p{N}»)’])[ \t]+(?=,(?!\p{N})|\.(?=[\s»)"”’]|$))/gu,
      to: () => "",
    },
  ];
  return list.filter((r): r is Rule => Boolean(r));
}

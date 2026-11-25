/** fr-CA: Office québécois de la langue française. fr-FR: the usual French (France) practice. */
export type Locale = "fr-CA" | "fr-FR";
/** What the input is: only its text is typeset; code, tags and link targets are left exactly as written. */
export type Format = "text" | "markdown" | "html";

export interface Options {
  /** Default fr-CA. */
  locale?: Locale;
  /** Default text. */
  format?: Format;
  /**
   * The space before ; ! and ?. fr-CA: "none" (default, the OQLF's choice) or "narrow" (a narrow no-break space, which
   * the OQLF also accepts). fr-FR: always "narrow".
   */
  highPunctuation?: "none" | "narrow";
  /** Straight double quotes "…" become « … ». Default true. */
  quotes?: boolean;
  /** A straight apostrophe between letters becomes ’ (l'été → l’été). Default true. */
  apostrophes?: boolean;
  /** Three dots become one ellipsis character. Default true. */
  ellipsis?: boolean;
  /** 8h30, 22H → 8 h 30, 22 h. Default true. */
  hours?: boolean;
  /** 8:30 → 8 h 30 too. Off by default: the OQLF accepts 8:30 in tables and technical text. */
  colonHours?: boolean;
  /** 2ème, 1ère, 1ier → 2e, 1re, 1er. Default true. */
  ordinals?: boolean;
  /** $29 → 29 $ (an amount without a decimal point only). Default true. */
  dollarAfter?: boolean;
  /** Group a four-digit amount too (1490 $ → 1 490 $). Off by default: the OQLF leaves it optional. */
  groupFourDigits?: boolean;
  /** Spellings to leave exactly as written, such as brand names: ["Toqué!", "Yahoo!"]. */
  keep?: readonly string[];
}

export type Resolved = Required<Options>;

export function resolve(o: Options = {}): Resolved {
  const locale = o.locale ?? "fr-CA";
  return {
    locale,
    format: o.format ?? "text",
    highPunctuation: locale === "fr-FR" ? "narrow" : (o.highPunctuation ?? "none"),
    quotes: o.quotes ?? true,
    apostrophes: o.apostrophes ?? true,
    ellipsis: o.ellipsis ?? true,
    hours: o.hours ?? true,
    colonHours: o.colonHours ?? false,
    ordinals: o.ordinals ?? true,
    dollarAfter: o.dollarAfter ?? true,
    groupFourDigits: o.groupFourDigits ?? false,
    keep: o.keep ?? [],
  };
}

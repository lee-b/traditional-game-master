// Who a character or an NPC is drawn to (issue 501): some of the sexes a
// character can be, and a short note in the table's own words. Blank means
// unspecified. A character left blank who opts in to advances is open to
// anyone; an NPC left blank is undecided, and the DM fixes it the first time
// it matters (set_npc keeps the first value it is given).
//
// Identity, like sex (src/lib/sex.ts), so it is a fixed set of choices
// the server can match both ways, whatever language the table plays in.
// Pure and zod-free, so the builder, the NPC form and the test scripts
// import it directly.

import { SEXES, type Sex } from "./sex.ts";
import { textKey } from "./language/text-logic.ts";

export type AttractionSex = (typeof SEXES)[number];

// `open` (issue 642): open to more than one partner. Romance is exclusive
// by default, so it is stored only when true and absent means exclusive.
export type Attraction = { sexes: AttractionSex[]; note: string; open?: boolean };

export const ATTRACTION_NOTE_MAX = 60;

// The chip labels, in the order the chips show, and the words the DM reads.
export const ATTRACTION_CHOICES: ReadonlyArray<{ sex: AttractionSex; label: string; word: string }> = [
  { sex: "Female", label: "Women", word: "women" },
  { sex: "Male", label: "Men", word: "men" },
];

// The drawnTo word that says someone keeps more than one partner (issue
// 642): beside who they are drawn to, as the picker shows it.
export const TOLD_OPEN = "open relationships";

// What the DM's tools take for drawnTo: the same words the DM reads.
export const TOLD_ATTRACTION: [string, ...string[]] = [ATTRACTION_CHOICES[0].word, ...ATTRACTION_CHOICES.slice(1).map((choice) => choice.word), TOLD_OPEN];

export const BLANK_ATTRACTION: Attraction = { sexes: [], note: "" };

// Any stored or sent value as an attraction: unknown sexes are dropped,
// repeats folded, the note trimmed to its length. A string is a stored JSON
// column; anything unreadable reads as blank.
export function normalizeAttraction(raw: unknown): Attraction {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = value.trim() ? JSON.parse(value) : null;
    } catch {
      value = null;
    }
  }
  if (!value || typeof value !== "object") {
    return { sexes: [], note: "" };
  }
  const record = value as { sexes?: unknown; sexes?: unknown; note?: unknown };
  // The stored key was "genders" until the sex rename: older values read
  // either way, and the dropped "Nonbinary" choice degrades to unspecified.
  const listed = Array.isArray(record.sexes)
    ? record.sexes
    : Array.isArray(record.genders)
      ? record.genders
      : [];
  const sexes = SEXES.filter((sex) => listed.includes(sex));
  const note = typeof record.note === "string" ? record.note.replace(/\s+/g, " ").trim().slice(0, ATTRACTION_NOTE_MAX) : "";
  return { sexes: [...sexes], note, ...((record as { open?: unknown }).open === true ? { open: true } : {}) };
}

// Whether they are open to more than one partner (issue 642). Blank, and
// every value written before the trait, is exclusive.
export function openToMore(attraction: Attraction | null | undefined): boolean {
  return attraction?.open === true;
}

export function attractionBlank(attraction: Attraction | null | undefined): boolean {
  return !attraction || (!attraction.sexes.length && !attraction.note.trim());
}

// Whether someone of `sex` fits this attraction. Blank fits anyone. A
// chosen set fits only the sexes in it, so someone whose sex is
// unspecified fits only a blank one: the server never guesses.
export function drawnTo(attraction: Attraction | null | undefined, sex: Sex | undefined): boolean {
  if (!attraction || !attraction.sexes.length) {
    return true;
  }
  return Boolean(sex) && attraction.sexes.includes(sex as AttractionSex);
}

// Both ways: each is drawn to the other's sex.
export function attractionFits(
  a: { attraction?: Attraction | null; sex?: Sex },
  b: { attraction?: Attraction | null; sex?: Sex },
): boolean {
  return drawnTo(a.attraction, b.sex) && drawnTo(b.attraction, a.sex);
}

// "women and men (only the brave ones)", or "" when blank.
export function attractionWords(attraction: Attraction | null | undefined): string {
  if (attractionBlank(attraction)) {
    return "";
  }
  const words = ATTRACTION_CHOICES.filter((choice) => attraction!.sexes.includes(choice.sex)).map((choice) => choice.word);
  const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : words.join("");
  const note = attraction!.note.trim();
  return list ? (note ? `${list} (${note})` : list) : note;
}

// The words a tool call sent ("women", "Men") as an attraction; unknown
// words are dropped. Null when nothing usable was sent, so a call that said
// nothing never blanks what is stored.
export function attractionFromTold(words: unknown, note?: unknown): Attraction | null {
  const list = Array.isArray(words) ? words.map((word) => textKey(String(word))) : [];
  const sexes = ATTRACTION_CHOICES.filter((choice) =>
    list.some((word) => [choice.word, choice.label, choice.sex].some((name) => textKey(name) === word)),
  ).map((choice) => choice.sex);
  const text = typeof note === "string" ? note.replace(/\s+/g, " ").trim().slice(0, ATTRACTION_NOTE_MAX) : "";
  const open = list.includes(textKey(TOLD_OPEN));
  if (!sexes.length && !text && !open) {
    return null;
  }
  return { sexes, note: text, ...(open ? { open: true } : {}) };
}

// The value an NPC row keeps when the DM tells it again (set_npc keeps the
// first answer, so who they are drawn to never changes between characters):
// a blank one takes the new answer, and openness only ever turns on, so a
// world whose custom it is can say so after the first answer (issue 642).
export function keptAttraction(existing: Attraction, told: Attraction | null | undefined): Attraction {
  const kept = attractionBlank(existing) && told ? { sexes: told.sexes, note: told.note } : { sexes: existing.sexes, note: existing.note };
  return openToMore(existing) || openToMore(told) ? { ...kept, open: true } : kept;
}

export function attractionJson(attraction: Attraction | null | undefined): string {
  return attractionBlank(attraction) && !openToMore(attraction) ? "" : JSON.stringify(normalizeAttraction(attraction));
}

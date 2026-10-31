// A character's or an NPC's sex: one of the character builder's choices,
// or "" for unspecified. A fixed value rather than free text, so the voice
// cast, the stand-in face and the speech reader's pronouns read it the same
// way at every table, whatever language the table plays in. Pure and
// zod-free, so the builder and the NPC form import it.

export const SEXES = ["Female", "Male"] as const;
export type Sex = (typeof SEXES)[number] | "";

// A stored value as a choice. Sheets written through the API before the
// field was fixed may hold free text; it reads as unspecified.
export function storedSex(raw: unknown): Sex {
  return SEXES.includes(raw as (typeof SEXES)[number]) ? (raw as Sex) : "";
}

// The sex as "she" or "he" would stand for it: what picks a voice, and
// what the English pronouns of a speech line are matched against.
export type SexMark = "f" | "m" | "";

export function sexMark(sex: Sex | undefined): SexMark {
  return sex === "Female" ? "f" : sex === "Male" ? "m" : "";
}

// What the AI DM's tools and the console take when they register someone: a
// choice, or "Unknown" while the story has not shown it, stored as
// unspecified. "Unknown" never clears a sex already recorded.
export const TOLD_SEXES = [...SEXES, "Unknown"] as const;
export type ToldSex = (typeof TOLD_SEXES)[number];

export function toldSex(told: ToldSex | undefined): Exclude<Sex, ""> | undefined {
  return told === "Unknown" ? undefined : told;
}

export const TOLD_SEX_HELP = "Their sex as the story presents them, which picks their voice; Unknown until it shows.";

// The romance gate: a suitor may court only a target of the opposite sex.
// Both sexes known and the same is the only block; a sex the story has
// not shown does not, so the story never stalls on a field nobody set.
export function sameKnownSex(a: Sex | undefined, b: Sex | undefined): boolean {
  return a !== undefined && b !== undefined && a !== "" && b !== "" && a === b;
}

// A person's sex is a fixed field (src/lib/sex.ts), set by the DM's
// tools and the console as the builder sets it: what the voice cast and the
// speech reader's pronouns read, at every table, instead of the words of a
// description. A value outside the choice is refused where it is written,
// and free text an old sheet or file holds reads as unspecified.
import assert from "node:assert/strict";
import { openWorld } from "./lib/enforce-world.mjs";
import { suite } from "./lib/enforce-harness.mjs";

const { test, finish } = suite("test-sex-field");
const { listNpcs } = await import("../src/lib/db/npcs.ts");
const { storedSheetSchema, createSheetSchema } = await import("../src/lib/schemas/sheet.ts");
const { storedSex } = await import("../src/lib/sex.ts");

const world = await openWorld({ gameSettings: { tableLanguage: "italian" } });
world.addHero({ class: "fighter", level: 1, maxHp: 12 });
const npc = (name) => listNpcs(world.campaignId).find((entry) => entry.name === name);

await test("set_npc records a sex, keeps it when a later call leaves it out, and refuses one outside the choice", async () => {
  const written = await world.invoke("set_npc", { name: "Nonna Rosa", trait: "Una vecchia fornaia.", sex: "Female" });
  assert.equal(written.ok, true, written.error);
  assert.equal(npc("Nonna Rosa").sex, "Female");
  await world.invoke("set_npc", { name: "Nonna Rosa", attitude: "friendly" });
  assert.equal(npc("Nonna Rosa").sex, "Female", "re-registering never resets it");
  const refused = await world.invoke("set_npc", { name: "Bruno", sex: "donna" });
  assert.notEqual(refused.ok, true);
  assert.equal(npc("Bruno"), undefined);
});

await test("set_npc asks again, never refuses, when it registers someone with no sex; Unknown clears nothing", async () => {
  const quiet = await world.invoke("set_npc", { name: "La figura incappucciata" });
  assert.equal(quiet.ok, true, quiet.error);
  assert.match(quiet.result.note, /sex is not recorded/);
  assert.equal(npc("La figura incappucciata").sex, "");
  const later = await world.invoke("set_npc", { name: "La figura incappucciata", attitude: "hostile" });
  assert.doesNotMatch(later.result.note, /sex is not recorded/, "an update is not asked");
  const unknown = await world.invoke("set_npc", { name: "Il pellegrino", sex: "Unknown" });
  assert.doesNotMatch(unknown.result.note, /sex is not recorded/, "Unknown is an answer");
  await world.invoke("set_npc", { name: "Nonna Rosa", sex: "Unknown" });
  assert.equal(npc("Nonna Rosa").sex, "Female");
});

await test("npc_reaction registers a stranger with a sex, and refuses one without", async () => {
  const met = await world.invoke("npc_reaction", { name: "Il barcaiolo", sex: "Male" });
  assert.equal(met.ok, true, met.error);
  assert.equal(npc("Il barcaiolo").sex, "Male");
  const refused = await world.invoke("npc_reaction", { name: "La pescivendola" });
  assert.notEqual(refused.ok === true && !refused.result?.error, true);
  assert.equal(npc("La pescivendola"), undefined);
});

await test("add_companion refuses a companion with no sex", async () => {
  const refused = await world.invoke("add_companion", { name: "Pia", class: "fighter", race: "human", level: 1, personality: "Taciturna.", kind: "guest" });
  assert.notEqual(refused.ok === true && !refused.result?.error, true);
});

await test("add_companion gives the companion's sheet its sex", async () => {
  const joined = await world.invoke("add_companion", {
    name: "Lia",
    class: "fighter",
    race: "human",
    level: 1,
    personality: "Asciutta, leale.",
    kind: "guest",
    sex: "Female",
  });
  assert.equal(joined.ok, true, joined.error);
  assert.equal(world.sheet(joined.result.characterId).sex, "Female");
});

await test("a new sheet takes only a choice; a stored sheet's free text reads as unspecified", () => {
  const sheet = {
    name: "Ada",
    race: "human",
    class: "fighter",
    abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    maxHp: 12,
    ac: 16,
    hitDice: { die: "d10", total: 1, spent: 0 },
    proficiencies: { saves: [], skills: [], expertise: [], languages: [], tools: [], armor: [], weapons: [] },
  };
  assert.equal(createSheetSchema.safeParse({ ...sheet, sex: "Female" }).data?.sex, "Female");
  assert.equal(createSheetSchema.safeParse({ ...sheet, sex: "she/her" }).success, false);
  const stored = storedSheetSchema.safeParse({ ...sheet, sex: "she/her" });
  assert.equal(stored.success, true);
  assert.equal(stored.data.sex, "");
  // A value the enum held before "Nonbinary" was dropped reads as
  // unspecified.
  assert.equal(storedSex("Nonbinary"), "");
  assert.equal(storedSex("female"), "", "the choice is compared as written");
});

await test("a sheet or bundle written before the rename, under the key gender, loads as the sex", async () => {
  const sheet = {
    name: "Ada",
    race: "human",
    class: "fighter",
    abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    maxHp: 12,
    ac: 16,
    hitDice: { die: "d10", total: 1, spent: 0 },
    proficiencies: { saves: [], skills: [], expertise: [], languages: [], tools: [], armor: [], weapons: [] },
  };
  const legacy = storedSheetSchema.safeParse({ ...sheet, gender: "Female" });
  assert.equal(legacy.success, true);
  assert.equal(legacy.data.sex, "Female", "the old key reads as the new one");
  const legacyOdd = storedSheetSchema.safeParse({ ...sheet, gender: "she/her" });
  assert.equal(legacyOdd.success, true);
  assert.equal(legacyOdd.data.sex, "");
  const npcSchema = (await import("../src/lib/workshop/bundle-schema.ts")).npcSchema;
  const bundle = npcSchema.safeParse({ name: "Mira", gender: "Male" });
  assert.equal(bundle.success, true, bundle.error?.toString());
  assert.equal(bundle.data?.sex, "Male", "an old bundle's npc loads as the sex");
});

world.close();
finish();

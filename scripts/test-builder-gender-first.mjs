// The sex is asked on the class step, above the class cards, because
// their art follows it, as the ancestry cards' does after them. Asked with
// the name on the last step (pull request 513, backlog F4), it left every
// card before it in a look nobody had chosen. It has no default: unset is a
// real answer, saved as unset. Until it is chosen each card shows its own
// stable look among the three painted (lineage.ts previewSex), which is
// only what the card shows. The clicks are walked in
// scripts/browser/scenarios/102-builder-sex.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";

register("./lib/register-alias.mjs", import.meta.url);

const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { classArt, lineageArt, previewSex } = await import("../src/app/characters/builder/lineage.ts");
const { classCard } = await import("../src/app/characters/builder/cardFaces.ts");
const { summaryRows } = await import("../src/app/characters/builder/summary.ts");
const { SexField } = await import("../src/app/characters/builder/steps/CallingSetup.tsx");
const { SRD_RACES, SRD_CLASSES } = await import("../src/lib/srd/index.ts");
const { CUSTOM_CLASSES } = await import("../src/lib/classes/index.ts");

// Windows CI checks out with CRLF.
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const exists = (url) => fs.existsSync(new URL(`../public${url}`, import.meta.url));
const look = (art) => /-(feminine|masculine|neutral)\.webp$/.exec(art)?.[1];

let passed = 0;
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const builder = read("src/app/characters/builder/CharacterBuilder.tsx");
const calling = read("src/app/characters/builder/steps/CallingStep.tsx");
const identity = read("src/app/characters/builder/steps/IdentityStep.tsx");

await test("the class step asks the sex above the class cards, and the Hero step no longer does", () => {
  const step = builder.slice(builder.indexOf('      key: "calling",'), builder.indexOf('      key: "ancestry",'));
  assert.match(step, /sexField=\{<SexField state=\{state\}/);
  const at = calling.indexOf("{sexField}");
  assert.ok(at > 0, "the class step draws the sex");
  assert.ok(at > calling.indexOf("<PlaystylePicker") && at < calling.indexOf("<OptionCardGrid"), "between the playstyle question and the cards");
  // The Hero step says it and points back; it holds no control that sets it.
  assert.doesNotMatch(identity, /setSex|<Select/);
  assert.match(identity, /onClick=\{onEditSex\}[^>]*>\s*Change on the Class step/);
  assert.match(builder, /onEditSex=\{\(\) => changePick\("sex"\)\}/);
  assert.match(builder, /target === "sex" \? "calling" :/, "its way back opens the class step");
});

await test("the sex starts unchosen, with no default", () => {
  const html = renderToStaticMarkup(createElement(SexField, { state: { sex: "", setSex: () => {} } }));
  assert.match(html, /data-builder-target="sex"/);
  assert.match(html, />Not chosen</, "the trigger reads Not chosen");
  assert.match(html, /The cards show a mix of looks until you choose/);
  const state = read("src/app/characters/builder/useBuilderState.ts");
  assert.match(state, /useState<Sex>\(initial\?\.sex \?\? ""\)/, "a new hero starts unset");
});

await test("a chosen sex is what every class and lineage card shows", () => {
  const classIds = [...SRD_CLASSES.map((klass) => klass.id), ...CUSTOM_CLASSES.map((klass) => klass.id)];
  // "Nonbinary" is kept in the list to prove the value the choice held
  // before it was dropped degrades to the neutral plate.
  for (const [sex, expected] of [["Female", "feminine"], ["Male", "masculine"], ["Nonbinary", "neutral"]]) {
    for (const id of classIds) {
      assert.equal(look(classArt(id, sex)), expected, `${id} as ${sex}`);
    }
    for (const race of SRD_RACES) {
      assert.equal(look(lineageArt(race.id, race.name, sex)), expected, `${race.id} as ${sex}`);
    }
    // Through the class card's face, as the grid builds it.
    const card = classCard({ option: { id: "fighter", name: "Fighter" }, entry: undefined, reading: undefined, sex, numbers: false });
    assert.equal(look(card.art), expected);
  }
});

await test("unchosen, the cards show a stable mix of all three looks", () => {
  for (const ids of [SRD_CLASSES.map((klass) => klass.id), SRD_RACES.map((race) => race.id)]) {
    const looks = ids.map((id) => previewSex(id, ""));
    assert.deepEqual([...new Set(looks)].sort(), ["Female", "Male"], "both appear");
    // The same pick on every call, so a re-render or a reload shows the same card.
    assert.deepEqual(ids.map((id) => previewSex(id, "")), looks);
  }
  assert.equal(look(classArt("wizard", "")), look(classArt("wizard", previewSex("wizard", ""))));
  assert.equal(look(lineageArt("hill_dwarf", "Hill Dwarf", "")), look(lineageArt("hill_dwarf", "Hill Dwarf", previewSex("hill_dwarf", ""))));
  // Every preview pick is a plate that ships, the hooded stranger included
  // for a pack lineage no family covers.
  for (const id of [...SRD_CLASSES.map((klass) => klass.id), ...CUSTOM_CLASSES.map((klass) => klass.id)]) {
    assert.ok(exists(classArt(id, "")), `${classArt(id, "")} exists`);
  }
  for (const race of SRD_RACES) {
    assert.ok(exists(lineageArt(race.id, race.name, "")), race.id);
  }
  assert.ok(exists(lineageArt("spacefolk", "Spacefolk", "")));
});

await test("the preview writes no sex: the sheet and the summary keep the player's", () => {
  // Only the card art reads the preview.
  for (const path of ["submit.ts", "useBuilderState.ts", "summary.ts", "builderDraft.ts", "CharacterBuilder.tsx"]) {
    assert.doesNotMatch(read(`src/app/characters/builder/${path}`), /previewSex/, path);
  }
  assert.match(read("src/app/characters/builder/submit.ts"), /\n\s+sex: state\.sex,\n/);
  const base = { name: "Wren", klass: "Wizard", level: 1, abilities: null, casts: false, cantrips: [], spells: [], gear: [], portrait: false, appearance: false, backstory: false, owed: { identity: [], ancestry: [], calling: [], abilities: [], spells: [] } };
  const [unset] = summaryRows(base);
  assert.deepEqual(unset.lines, ["Wizard, level 1"], "an unset sex is not said, and owes nothing");
  assert.deepEqual(unset.owed, []);
  const [chosen] = summaryRows({ ...base, sex: "Female" });
  assert.equal(chosen.key, "calling", "its Edit opens the class step");
  assert.deepEqual(chosen.lines, ["Wizard, level 1", "Sex: Female"]);
  assert.match(builder, /sex: state\.sex \|\| undefined,/);
});

console.log(`test-builder-sex-first: ${passed} passed`);

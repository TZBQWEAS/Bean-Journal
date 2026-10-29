const { JSDOM } = require("jsdom"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../dist");
function start(saved) {
  const dom = new JSDOM(
      fs.readFileSync(path.join(root, "index.html"), "utf8"),
      { url: "https://coffee.test", runScripts: "outside-only" },
    ),
    w = dom.window;
  w.structuredClone = structuredClone;
  w.navigator.locks = { request: (_name, fn) => Promise.resolve(fn()) };
  w.confirm = () => true;
  w.setTimeout = () => 0;
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.localStorage.setItem("doujian-v1", JSON.stringify(saved));
  for (const f of [
    "preferences.js",
    "samples.js",
    "map-data.js",
    "origin-map.js",
    "dashboard.js",
    "workbench.js",
    "app.js",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(root, f), "utf8"),
      dom.getInternalVMContext(),
    );
  return w;
}
const w = start({
    beans: [{ id: "bean", name: "Test bean", roast: "浅烘" }],
    brews: [],
  }),
  d = w.document;
const click = (s) => d.querySelector(s).click(),
  field = (n, v) => {
    const el = d.querySelector("[name=" + n + "]");
    el.value = v;
    el.dispatchEvent(new w.Event("change"));
  },
  submit = () =>
    d
      .querySelector("#form")
      .dispatchEvent(new w.Event("submit", { cancelable: true })),
  saved = () => JSON.parse(w.localStorage.getItem("doujian-v1"));
click("[data-view=devices]");
click("#addBean");
field("name", "My machine");
field("type", "machine");
submit();
click("#addBean");
field("name", "My grinder");
field("type", "grinder");
submit();
assert.equal(saved().devices.length, 2);
const [machine, grinder] = saved().devices;
click("[data-view=favorites]");
click("#addBean");
field("name", "Daily espresso");
field("beanId", "bean");
field("method", "意式浓缩");
field("dose", "18");
field("yield", "36");
field("time", "28");
field("grind", "5");
field("machineId", machine.id);
field("grinderId", grinder.id);
field("notes", "Preheat, then pull the shot.");
submit();
assert.equal(saved().recipes.length, 1);
assert.equal(
  saved().brews.length,
  0,
  "Creating recipe must not count as a brew",
);
const recipe = saved().recipes[0];
assert.equal(recipe.machine, "My machine");
assert.equal(d.querySelectorAll(".recipe-card").length, 1);
assert.equal(d.querySelectorAll(".brew").length, 0);
click("[data-view=brews]");
click("#addBean");
field("date", "2026-10-01");
field("notes", "Actual tasting note");
field("recipeId", recipe.id);
assert.equal(d.querySelector("[name=date]").value, "2026-10-01");
assert.equal(d.querySelector("[name=notes]").value, "Actual tasting note");
assert.equal(d.querySelector("[name=dose]").value, "18");
assert.equal(d.querySelector("[name=grinderId]").value, grinder.id);
field("dose", "19");
submit();
assert.equal(saved().brews[0].dose, "19");
assert.equal(saved().recipes[0].dose, "18");
assert.equal(saved().brews[0].recipeName, "Daily espresso");
assert.equal(saved().brews[0].machine, "My machine");
click("[data-view=favorites]");
click("[data-recipe]");
field("name", "Updated espresso");
field("dose", "20");
submit();
assert.equal(saved().brews[0].recipeName, "Daily espresso");
assert.equal(saved().brews[0].dose, "19");
assert(d.querySelector(".recipe-card").textContent.includes("1"));
click("[data-view=devices]");
click('[data-device="' + machine.id + '"]');
field("name", "Renamed machine");
submit();
assert.equal(saved().brews[0].machine, "My machine");
click('[data-device="' + machine.id + '"]');
click("#delete");
assert.equal(saved().devices[0].archived, true);
click("[data-view=brews]");
click("#addBean");
assert(
  ![...d.querySelector("[name=machineId]").options].some(
    (o) => o.value === machine.id,
  ),
);
click("#close");
click("[data-editbrew]");
assert.equal(d.querySelector("[name=machine]").value, "My machine");
submit();
assert.equal(saved().brews[0].machine, "My machine");
click("[data-save-recipe]");
assert.equal(d.querySelector("[name=dose]").value, "19");
field("name", "Adjusted shot");
submit();
assert.equal(saved().recipes.length, 2);
assert.equal(saved().brews.length, 1);
click("[data-view=favorites]");
click('[data-recipe="' + recipe.id + '"]');
click("#delete");
assert.equal(saved().recipes.length, 1);
assert.equal(saved().brews[0].recipeId, recipe.id);
assert.equal(saved().brews[0].recipeName, "Daily espresso");
click("[data-view=brews]");
click("[data-editbrew]");
assert.equal(d.querySelector("[name=recipeId]").value, recipe.id);
submit();
assert.equal(saved().brews[0].recipeName, "Daily espresso");
const backup = w.validateJournalBackup(saved());
assert.equal(backup.devices.length, 2);
assert.equal(backup.recipes.length, 1);
assert.equal(backup.brews[0].dose, "19");
const old = {
  beans: [{ id: "oldbean", name: "Legacy", roast: "浅烘" }],
  brews: [
    {
      id: "oldbrew",
      beanId: "oldbean",
      favorite: true,
      date: "2026-01-01",
      method: "手冲",
      grinder: "Old grinder",
      dose: "15",
      yield: "225",
      time: "150",
      notes: "Good cup",
    },
  ],
};
const legacy = start(old);
legacy.document.querySelector("[data-view=favorites]").click();
assert.equal(legacy.document.querySelectorAll(".recipe-card").length, 1);
const migrated = legacy.validateJournalBackup(old);
assert.equal(migrated.recipes.length, 1);
assert.equal(migrated.brews.length, 1);
assert.equal(
  legacy.normalizeJournal(migrated).recipes.length,
  1,
  "Migration must be idempotent",
);
legacy.document.querySelector("[data-brew-recipe]").click();
assert.equal(
  legacy.document.querySelector("[name=grinder]").value,
  "Old grinder",
);
w.savePreference("language", "en");
click("[data-view=devices]");
assert(d.querySelector("#sectionTitle").textContent.includes("My equipment"));
click("[data-view=favorites]");
assert(d.querySelector("#content").textContent.includes("Brew this recipe"));
console.log(
  "PASS: device CRUD/deactivation, template vs event separation, recipe autofill and actual overrides, historical snapshots, recipe deletion safety, save brew as recipe, backup round-trip, legacy favorites migration, English views.",
);
setImmediate(() => w.close());
setImmediate(() => legacy.close());

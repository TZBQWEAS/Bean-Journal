const { JSDOM } = require("jsdom"),
  fs = require("fs"),
  path = require("path"),
  vm = require("vm"),
  assert = require("assert/strict");
const root = path.resolve(__dirname, "../dist");
const seed = {
  beans: [{ id: "b", name: "Original bean", roast: "浅烘" }],
  brews: [
    {
      id: "brew",
      beanId: "b",
      date: "2024-02-29",
      method: "手冲",
      dose: "15",
      yield: "225",
      time: "150",
      grind: "一",
    },
  ],
  devices: [
    { id: "m", name: "Renamed", type: "machine", archived: false },
    { id: "g", name: "Inactive", type: "grinder", archived: true },
  ],
  recipes: [
    {
      id: "r",
      name: "Daily",
      dose: "15",
      yield: "225",
      time: "150",
      method: "手冲",
      machineId: "m",
      machine: "Old",
      grinderId: "g",
      grinder: "Inactive",
      notes: "1. Preheat\n2. Pour <slowly>",
    },
  ],
  schemaVersion: 2,
};
function start(shared = { value: JSON.stringify(seed) }) {
  const dom = new JSDOM(
      fs.readFileSync(path.join(root, "index.html"), "utf8"),
      { url: "https://coffee.test", runScripts: "outside-only" },
    ),
    w = dom.window;
  w.structuredClone = structuredClone;
  w.confirm = () => true;
  w.setTimeout = () => 0;
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const prefs = new Map();
  Object.defineProperty(w, "localStorage", {
    value: {
      getItem: (k) =>
        k === "doujian-v1" ? shared.value : prefs.get(k) || null,
      setItem: (k, v) => {
        if (k === "doujian-v1") shared.value = v;
        else prefs.set(k, v);
      },
    },
  });
  shared.queue ??= Promise.resolve();
  w.navigator.locks = {
    request: (_n, fn) => {
      const task = shared.queue.then(fn);
      shared.queue = task.catch(() => {});
      return task;
    },
  };
  for (const f of [
    "preferences",
    "samples",
    "map-data",
    "origin-map",
    "dashboard",
    "workbench",
    "app",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(root, f + ".js"), "utf8"),
      dom.getInternalVMContext(),
    );
  return {
    w,
    d: w.document,
    run: (s) => vm.runInContext(s, dom.getInternalVMContext()),
    saved: () => JSON.parse(shared.value),
    close: () => w.close(),
  };
}
(async () => {
  const a = start();
  a.run("openForm('brew',data.brews[0])");
  assert.equal(a.d.querySelector("[name=timeOfDay]").value, "");
  await a.d
    .querySelector("#form")
    .onsubmit({ preventDefault() {}, target: a.d.querySelector("#form") });
  assert.equal(a.saved().brews[0].timeOfDay, "");
  a.run("openForm('brew')");
  const recipe = a.d.querySelector("[name=recipeId]");
  recipe.value = "r";
  recipe.dispatchEvent(new a.w.Event("change"));
  assert.equal(a.d.querySelector("[name=machine]").value, "Renamed");
  assert.equal(a.d.querySelector("[name=grinderId]").value, "");
  assert.equal(
    a.d.querySelector("#recipeInstructions").textContent,
    "配方操作步骤\n1. Preheat\n2. Pour <slowly>",
  );
  assert.equal(a.d.querySelector("#recipeInstructions").children.length, 0);
  recipe.value = "";
  recipe.dispatchEvent(new a.w.Event("change"));
  assert(a.d.querySelector("#recipeInstructions").hidden);
  a.w.savePreference("language", "en");
  a.run("view='brews';render()");
  assert.equal(
    a.d.querySelector(".event-parameters [data-user]").textContent,
    "一",
  );
  assert.deepEqual(
    Array.from(a.w.originMatches("Brazil / Guji"), (x) => x.id),
    ["BRA"],
  );
  assert.equal(a.w.originMatches("Guji")[0].id, "ETH");
  for (const mutate of [
    (v) => (v.beans[0].flavors = 4),
    (v) => (v.brews[0].date = "2025-02-29"),
    (v) => (v.brews[0].timeOfDay = "25:00"),
    (v) => (v.brews[0].dose = -1),
  ]) {
    const v = structuredClone(seed);
    mutate(v);
    assert.throws(() => a.w.validateJournalBackup(v));
  }
  a.run("openForm('bean',data.beans[0])");
  await a.d.querySelector("#delete").onclick();
  assert.equal(a.saved().beans.length, 0);
  assert.equal(a.saved().brews.length, 1);
  assert.equal(a.saved().brews[0].beanName, "Original bean");
  a.run("openForm('brew',data.brews[0])");
  assert(a.d.querySelector("[name=date]"));
  await a.d
    .querySelector("#form")
    .onsubmit({ preventDefault() {}, target: a.d.querySelector("#form") });
  assert.equal(a.saved().brews.length, 1);
  assert(a.w.validateJournalBackup(a.saved()));
  a.w.localStorage.setItem("doujian-v1", "{broken");
  assert(await a.w.persist(seed, { replace: true }));
  assert.equal(a.saved().beans.length, 1);
  a.close();
  const shared = { value: JSON.stringify(seed) },
    x = start(shared),
    y = start(shared);
  const add = (ctx, id) =>
    ctx.run(
      `persist({...data,beans:[...data.beans,{id:'${id}',name:'${id}'}]})`,
    );
  assert.deepEqual(await Promise.all([add(x, "x"), add(y, "y")]), [true, true]);
  assert.equal(x.saved().beans.length, 3);
  x.w.refreshStoredJournal();
  y.w.refreshStoredJournal();
  x.run("openForm('bean',data.beans[0])");
  y.run("openForm('bean',data.beans[0])");
  assert(
    await x.run(
      "persist({...data,beans:data.beans.map(b=>b.id==='b'?{...b,name:'X'}:b)})",
    ),
  );
  y.w.refreshStoredJournal();
  assert.equal(
    await y.run(
      "persist({...data,beans:data.beans.map(b=>b.id==='b'?{...b,name:'Y'}:b)})",
    ),
    false,
  );
  assert.equal(y.saved().beans[0].name, "X");
  x.run("formBaseline=null");
  assert(await x.run("persist(data,{replace:true})"));
  y.run("formBaseline=null");
  assert.equal(await add(y, "stale"), false);
  assert(!y.saved().beans.some((b) => b.id === "stale"));
  x.close();
  y.close();
  console.log(
    "PASS: historical time, equipment resolution, safe readonly recipe steps, translation, country precedence, invalid backups, retained/editable orphan history, concurrent additions, stale form conflicts and import generation.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

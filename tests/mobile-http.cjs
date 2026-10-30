const { JSDOM } = require("jsdom"),
  fs = require("fs"),
  path = require("path"),
  vm = require("vm"),
  assert = require("assert/strict");
const { IDBFactory } = require("fake-indexeddb");
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
      { url: "http://192.168.1.10:8887", runScripts: "outside-only" },
    ),
    w = dom.window;
  w.structuredClone = structuredClone;
  Object.defineProperty(w.crypto, "randomUUID", { value: undefined });
  shared.idb ??= new IDBFactory();
  w.indexedDB = shared.idb;
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
  const shared = { value: JSON.stringify(seed) };
  const a = start(shared),
    b = start(shared);
  const submit = (app) =>
    app.d
      .querySelector("#form")
      .onsubmit({ preventDefault() {}, target: app.d.querySelector("#form") });
  a.run("openForm('bean')");
  b.run("openForm('bean')");
  a.d.querySelector("[name=name]").value = "HTTP A";
  b.d.querySelector("[name=name]").value = "HTTP B";
  await Promise.all([submit(a), submit(b)]);
  assert.equal(
    a.saved().beans.length,
    3,
    "HTTP concurrent additions must both survive",
  );
  const ids = a.saved().beans.map((x) => x.id);
  assert.notEqual(ids[1], ids[2]);
  assert.match(
    ids[1],
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  );
  a.run("refreshStoredJournal();openForm('bean',data.beans[0])");
  b.run("refreshStoredJournal();openForm('bean',data.beans[0])");
  a.d.querySelector("[name=name]").value = "First edit";
  b.d.querySelector("[name=name]").value = "Stale edit";
  await submit(a);
  await submit(b);
  assert.equal(a.saved().beans[0].name, "First edit");
  assert(b.d.querySelector("#modal").open, "conflicting draft stays open");
  assert.equal(b.d.querySelector("[name=name]").value, "Stale edit");
  assert.match(b.d.querySelector("#toast").textContent, /另一页面/);
  for (const kind of ["device", "recipe", "brew"]) {
    a.run("openForm('" + kind + "')");
    const name = a.d.querySelector("[name=name]");
    if (name) name.value = "HTTP " + kind;
    await submit(a);
    assert(!a.d.querySelector("#modal").open, kind + " saves on HTTP");
  }
  assert.equal(a.saved().devices.length, 3);
  assert.equal(a.saved().recipes.length, 2);
  assert.equal(a.saved().brews.length, 2);
  const c = start(shared);
  assert.equal(c.run("data.beans.length"), 3, "reload keeps beans");
  const backup = JSON.stringify(a.saved());
  assert.equal(
    await a.run("persist(" + backup + ", {replace:true})"),
    true,
    "backup restore on HTTP",
  );
  assert(a.saved().generation);
  b.run("openForm('bean',data.beans[0])");
  b.d.querySelector("[name=name]").value = "Must survive failure";
  Object.defineProperty(b.w.crypto, "getRandomValues", {
    value: () => {
      throw Error("unavailable");
    },
  });
  b.run("editing=null");
  await submit(b);
  assert(b.d.querySelector("#modal").open);
  assert.equal(b.d.querySelector("[name=name]").value, "Must survive failure");
  assert.match(b.d.querySelector("#toast").textContent, /保存失败/);
  for (const app of [a, b, c]) {
    await app.run("journalLockDatabase?.then(db=>db.close())");
    app.close();
  }
  const tap = start();
  const tapSubmit = () =>
    tap.d
      .querySelector("#form")
      .onsubmit({ preventDefault() {}, target: tap.d.querySelector("#form") });
  for (const kind of ["bean", "device", "recipe", "brew"]) {
    tap.run("openForm('" + kind + "')");
    const name = tap.d.querySelector("[name=name]");
    if (name) name.value = "Double tap " + kind;
    const list = {
      bean: "beans",
      device: "devices",
      recipe: "recipes",
      brew: "brews",
    }[kind];
    const before = tap.saved()[list].length;
    await Promise.all([tapSubmit(), tapSubmit(), tapSubmit()]);
    assert.equal(
      tap.saved()[list].length,
      before + 1,
      kind + " must save only once",
    );
    assert.equal(tap.d.querySelector("[type=submit]").disabled, false);
  }
  await tap.run("journalLockDatabase.then(db=>db.close())");
  tap.run("openForm('bean')");
  tap.d.querySelector("[name=name]").value = "Reconnected";
  await tapSubmit();
  assert(
    tap.saved().beans.some((x) => x.name === "Reconnected"),
    "closed HTTP lock connection must reopen",
  );
  Object.defineProperty(tap.w.navigator, "userAgent", {
    value: "Mozilla/5.0 (iPhone)",
    configurable: true,
  });
  tap.w.matchMedia = () => ({ matches: false });
  tap.run("updateMobileNavigation()");
  assert(
    tap.d.documentElement.classList.contains("phone-navigation"),
    "landscape iPhone stays compact",
  );
  Object.defineProperty(tap.w.navigator, "userAgent", {
    value: "Mozilla/5.0 (Macintosh)",
    configurable: true,
  });
  Object.defineProperty(tap.w.navigator, "platform", {
    value: "MacIntel",
    configurable: true,
  });
  Object.defineProperty(tap.w.navigator, "maxTouchPoints", {
    value: 5,
    configurable: true,
  });
  tap.w.matchMedia = () => ({ matches: true });
  tap.run("updateMobileNavigation()");
  assert(
    !tap.d.documentElement.classList.contains("phone-navigation"),
    "split-view iPad stays expanded",
  );
  await tap.run("journalLockDatabase.then(db=>db.close())");
  tap.close();
  console.log(
    "PASS: duplicate submit protection, closed-connection recovery, phone landscape/iPad split-view detection, HTTP UUID fallback, IndexedDB cross-tab serialization, stale edit protection, bean/device/recipe/brew saves, reload, restore and failure draft preservation.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

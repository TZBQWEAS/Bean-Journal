const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "../dist");
const dom = new JSDOM(fs.readFileSync(path.join(root, "index.html"), "utf8"), {
    url: "https://coffee.test",
    runScripts: "outside-only",
  }),
  w = dom.window,
  d = w.document;
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
w.localStorage.setItem(
  "doujian-v1",
  JSON.stringify({
    beans: [{ id: "bean", name: "Test bean", roast: "浅烘" }],
    brews: [
      {
        id: "a",
        beanId: "bean",
        date: "2024-02-29",
        dose: "15",
        yield: "225",
        time: "150",
        method: "手冲",
      },
      {
        id: "b",
        beanId: "bean",
        date: "2024-02-29",
        dose: "18",
        yield: "36",
        time: "30",
        method: "意式浓缩",
      },
      {
        id: "c",
        beanId: "bean",
        date: "2024-02-02",
        dose: "20",
        yield: "300",
        time: "160",
        method: "手冲",
      },
    ],
  }),
);
for (const file of [
  "preferences.js",
  "samples.js",
  "map-data.js",
  "origin-map.js",
  "dashboard.js",
  "workbench.js",
  "app.js",
])
  vm.runInContext(
    fs.readFileSync(path.join(root, file), "utf8"),
    dom.getInternalVMContext(),
  );
vm.runInContext(
  "calendarMonth=new Date(2024,1,1);selectedBrewDate='2024-02-29';renderDashboard()",
  dom.getInternalVMContext(),
);
assert.equal(d.querySelectorAll(".calendar-day").length, 29);
assert.equal(d.querySelectorAll(".calendar-day.has-brew").length, 2);
assert.equal(d.querySelectorAll(".selected-day .recent-brew").length, 2);
assert.deepEqual(
  [...d.querySelectorAll(".monthly-metrics strong")].map((x) => x.textContent),
  ["3", "2", "53.0 g"],
);
assert.equal(d.querySelector(".favorite-method strong").textContent, "手冲");
d.querySelector("[data-log-day]").click();
assert.equal(d.querySelector("[name=date]").value, "2024-02-29");
d.querySelector("#close").click();
d.querySelector('[data-calendar-step="1"]').click();
assert.equal(d.querySelectorAll(".calendar-day").length, 31);
d.querySelector("[data-calendar-today]").click();
assert(d.querySelector(".calendar-day.is-today"));
w.savePreference("language", "en");
assert(d.querySelector("#dashboard").textContent.includes("Brew calendar"));
assert.equal(d.querySelectorAll("nav .nav-icon").length, 6);
assert.equal(d.querySelectorAll("nav .nav-label").length, 6);
assert(!d.querySelector(".side-bottom").textContent.includes("好咖啡"));
console.log(
  "PASS: leap-year calendar, daily markers, daily records, month summaries, date-prefilled logging, month navigation, today, English dashboard, sidebar structure.",
);
w.close();

const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../dist");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [
  "journal-model.js",
  "preferences.js",
  "samples.js",
  "map-data.js",
  "origin-map.js",
  "dashboard.js",
  "workbench.js",
  "app.js",
].map((p) => fs.readFileSync(path.join(root, p), "utf8"));
function app(storage = {}, stayHome = false) {
  const dom = new JSDOM(html, {
    url: "https://coffee.test",
    runScripts: "outside-only",
  });
  const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.JOURNAL_SERVER = false;
  w.structuredClone = structuredClone;
  w.navigator.locks = { request: (_name, fn) => Promise.resolve(fn()) };
  w.confirm = () => true;
  w.setTimeout = () => 0;
  for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  for (const s of scripts)
    require("node:vm").runInContext(s, dom.getInternalVMContext());
  w.testEval = (code) =>
    require("node:vm").runInContext(code, dom.getInternalVMContext());
  if (!stayHome) w.document.querySelector("[data-view=beans]").click();
  return w;
}
(async () => {
  const w = app(),
    d = w.document;
  const click = (s) => d.querySelector(s).click();
  const change = (s, value) => {
    d.querySelector(s).value = value;
    d.querySelector(s).dispatchEvent(new w.Event("change"));
  };
  click("#settingsButton");
  assert(d.querySelector("#settingsDialog").open);
  change("#languageSelect", "en");
  change("#themeSelect", "dark");
  assert.equal(d.documentElement.lang, "en");
  assert.equal(d.documentElement.dataset.theme, "dark");
  assert.equal(d.querySelector("#addBean").textContent, "+ Add beans");
  click("#closeSettings");
  click("#addBean");
  assert.equal(d.querySelector("#modalTitle").textContent, "Add beans");
  d.querySelector("[name=name]").value = "设置";
  change("[name=roast]", "深烘");
  change("[name=beanType]", "拼配");
  const photo = "data:image/jpeg;base64,/9j/AAAA";
  w.testEval(`draftPhoto=${JSON.stringify(photo)};updatePhotoPreview()`);
  assert.equal(d.querySelector("#photoPreview img").getAttribute("src"), photo);
  await d
    .querySelector("#form")
    .onsubmit({ preventDefault() {}, target: d.querySelector("#form") });
  assert.equal(
    d.querySelector(".card-body h3").textContent,
    "设置",
    "User content must not be translated",
  );
  assert.equal(d.querySelector(".bean-kind").textContent, "Blend");
  assert.equal(d.querySelector(".card-art").dataset.roast, "dark");
  assert.equal(
    d.querySelectorAll(".bean img").length,
    0,
    "Photo must never appear on cards",
  );
  let saved = JSON.parse(w.localStorage.getItem("doujian-v1"));
  assert.equal(saved.beans[0].roast, "深烘");
  assert.equal(saved.beans[0].beanType, "拼配");
  assert.equal(saved.beans[0].photo, photo);
  click("[data-editbean]");
  assert.equal(d.querySelector("[name=beanType]").value, "拼配");
  assert.equal(d.querySelector("#photoPreview img").getAttribute("src"), photo);
  click("#removePhoto");
  assert.equal(d.querySelectorAll("#photoPreview img").length, 0);
  click("#close");
  click("[data-editbean]");
  assert(
    d.querySelector("#photoPreview img"),
    "Cancel must preserve saved photo",
  );
  click("#close");
  click("#newBrew");
  assert.equal(d.querySelector("[name=beanId] option").textContent, "设置");
  assert.equal(d.querySelector("[name=method]").value, "手冲");
  await d
    .querySelector("#form")
    .onsubmit({ preventDefault() {}, target: d.querySelector("#form") });
  click("[data-view=brews]");
  assert(d.querySelector(".brew").textContent.includes("Pour over"));
  assert(!d.querySelector(".brew").textContent.includes("手冲"));
  click("[data-save-recipe]");
  await d
    .querySelector("#form")
    .onsubmit({ preventDefault() {}, target: d.querySelector("#form") });
  click("[data-view=favorites]");
  assert.equal(d.querySelectorAll(".recipe-card").length, 1);
  click("[data-brew-recipe]");
  assert.equal(d.querySelector("[name=dose]").value, "15");
  click("#close");
  const persisted = {
    "doujian-v1": w.localStorage.getItem("doujian-v1"),
    "doujian-preferences": w.localStorage.getItem("doujian-preferences"),
  };
  const reloaded = app(persisted);
  assert.equal(reloaded.document.documentElement.dataset.theme, "dark");
  assert.equal(reloaded.document.documentElement.lang, "en");
  assert.equal(reloaded.document.querySelectorAll(".bean").length, 1);
  click("#settingsButton");
  change("#languageSelect", "zh");
  change("#themeSelect", "light");
  assert.equal(d.documentElement.lang, "zh-CN");
  assert.equal(
    d.querySelector("#sectionTitle").firstChild.textContent.trim(),
    "心选配方",
  );
  assert.equal(d.documentElement.dataset.theme, "light");
  click("#closeSettings");
  assert.equal(w.safePhoto("javascript:alert(1)"), false);
  assert.equal(w.safePhoto("data:image/svg+xml;base64,AAAA"), false);
  assert.equal(w.safePhoto(photo), true);
  // Existing records with no new fields retain their values and remain editable.
  const legacy = app({
    "doujian-v1": JSON.stringify({
      beans: [{ id: "old", name: "Legacy bean", roast: "浅烘" }],
      brews: [],
    }),
  });
  legacy.document.querySelector("[data-editbean]").click();
  assert.equal(
    legacy.document.querySelector("[name=beanType]").value,
    "未分类",
  );
  assert(!legacy.document.querySelector("#photoPreview img"));
  await legacy.document.querySelector("#form").onsubmit({
    preventDefault() {},
    target: legacy.document.querySelector("#form"),
  });
  assert.equal(
    JSON.parse(legacy.localStorage.getItem("doujian-v1")).beans[0].name,
    "Legacy bean",
  );
  // All three roast levels render independently of card order.
  const roastApp = app({
    "doujian-v1": JSON.stringify({
      beans: ["浅烘", "中烘", "深烘"].map((roast, i) => ({
        id: String(i),
        name: "Bean " + i,
        roast,
      })),
      brews: [],
    }),
  });
  assert.deepEqual(
    [...roastApp.document.querySelectorAll(".card-art")].map(
      (x) => x.dataset.roast,
    ),
    ["light", "medium", "dark"],
  );
  const samples = app();
  samples.document.querySelector("#demo").click();
  let sampleRecords = JSON.parse(samples.localStorage.getItem("doujian-v1"));
  delete sampleRecords.beans[0].sampleKey;
  delete sampleRecords.beans[1].sampleKey;
  delete sampleRecords.beans[0].beanType;
  delete sampleRecords.beans[1].beanType;
  const oldSamples = app({
    "doujian-v1": JSON.stringify(sampleRecords),
    "doujian-preferences": JSON.stringify({ language: "en", theme: "light" }),
  });
  assert(
    oldSamples.document
      .querySelector("#content")
      .textContent.includes("Sample · Yirgacheffe"),
  );
  assert(
    oldSamples.document
      .querySelector("#content")
      .textContent.includes("Colombia"),
  );
  assert(
    oldSamples.document
      .querySelector("#content")
      .textContent.includes("Jasmine"),
  );
  assert(
    !/[\u3400-\u9fff]/.test(
      oldSamples.document.querySelector("#content").textContent,
    ),
    "Old samples must translate all card content",
  );
  oldSamples.document.querySelector("[data-editbean]").click();
  assert.equal(
    oldSamples.document.querySelector("[name=process]").value,
    "Washed",
  );
  assert(
    oldSamples.document
      .querySelector("[name=notes]")
      .value.includes("sample bean card"),
  );
  await oldSamples.document.querySelector("#form").onsubmit({
    preventDefault() {},
    target: oldSamples.document.querySelector("#form"),
  });
  assert.equal(
    JSON.parse(oldSamples.localStorage.getItem("doujian-v1")).beans[0].name,
    "示例 · 耶加雪菲",
    "Saving unchanged translated sample must retain canonical fields",
  );
  oldSamples.document.querySelector("[data-editbean]").click();
  oldSamples.document.querySelector("[name=flavors]").value =
    "My own tasting notes";
  await oldSamples.document.querySelector("#form").onsubmit({
    preventDefault() {},
    target: oldSamples.document.querySelector("#form"),
  });
  oldSamples.savePreference("language", "zh");
  assert(
    oldSamples.document
      .querySelector("#content")
      .textContent.includes("示例 · 耶加雪菲"),
  );
  assert(
    oldSamples.document
      .querySelector("#content")
      .textContent.includes("My own tasting notes"),
  );
  oldSamples.savePreference("language", "en");
  assert(
    oldSamples.document
      .querySelector("#content")
      .textContent.includes("My own tasting notes"),
  );
  oldSamples.document.querySelector("#newBrew").click();
  assert.equal(
    oldSamples.document.querySelector("[name=beanId] option").textContent,
    "Sample · Yirgacheffe",
  );
  await oldSamples.document.querySelector("#form").onsubmit({
    preventDefault() {},
    target: oldSamples.document.querySelector("#form"),
  });
  oldSamples.document.querySelector("[data-view=brews]").click();
  assert(
    oldSamples.document
      .querySelector(".brew h3")
      .textContent.includes("Sample · Yirgacheffe"),
  );
  setImmediate(() => samples.close());
  setImmediate(() => oldSamples.close());
  console.log(
    "PASS: settings, photos, legacy and new samples, sample detail translations, unchanged-save round trip, preservation of user edits, sample names in brew records.",
  );
  // Origin matching, grouping and UI navigation.
  assert.equal(w.originMatches("Papua New Guinea").length, 1);
  assert.equal(w.originMatches("Papua New Guinea")[0].id, "PNG");
  assert.equal(w.originMatches("云南 / 普洱")[0].id, "CHN");
  assert.equal(w.originMatches("埃塞俄比亚 / 耶加雪菲")[0].id, "ETH");
  assert.equal(w.originMatches("Ethiopia / Guji")[0].id, "ETH");
  assert.equal(w.originMatches("Brazil + Colombia").length, 2);
  assert.equal(w.originMatches("Unknown farm").length, 0);
  const mapped = app({
    "doujian-v1": JSON.stringify({
      beans: [
        { id: "a", name: "First", origin: "Ethiopia", roast: "浅烘" },
        { id: "b", name: "Second", origin: "埃塞俄比亚", roast: "深烘" },
        { id: "c", name: "Unmapped", origin: "Some farm", roast: "中烘" },
      ],
      brews: [],
    }),
  });
  assert(mapped.document.querySelector("#settingsDialog #export"));
  assert(mapped.document.querySelector("#settingsDialog #import"));
  assert(!mapped.document.querySelector("aside #export"));
  mapped.document.querySelector("[data-view=map]").click();
  assert.equal(mapped.document.querySelectorAll(".map-pin").length, 1);
  assert.equal(mapped.document.querySelector(".map-pin span").textContent, "2");
  assert(
    mapped.document.querySelector(".unmapped").textContent.includes("Unmapped"),
  );
  mapped.document
    .querySelector(".map-pin")
    .dispatchEvent(new mapped.Event("mouseenter"));
  assert.equal(mapped.document.querySelector("#originTooltip").hidden, false);
  assert(
    mapped.document
      .querySelector("#originTooltip")
      .textContent.includes("First"),
  );
  assert(
    mapped.document
      .querySelector("#originTooltip")
      .textContent.includes("Second"),
  );
  mapped.savePreference("language", "en");
  assert(
    mapped.document
      .querySelector("#sectionTitle")
      .textContent.includes("Origin map"),
  );
  assert(
    mapped.document
      .querySelector(".origin-group")
      .textContent.includes("Ethiopia"),
  );
  mapped.document.querySelector("[data-view=beans]").click();
  assert.equal(mapped.document.querySelector(".toolbar").hidden, false);
  mapped.document.querySelector("[data-editbean]").click();
  assert(mapped.document.querySelector("select[name=originCountry]"));
  assert(!mapped.document.querySelector("datalist"));
  assert.equal(
    mapped.document.querySelector("[name=origin]").value,
    "Ethiopia",
  );
  mapped.document.querySelector("[name=originCountry]").value = "CHN";
  mapped.document
    .querySelector("[name=originCountry]")
    .dispatchEvent(new mapped.Event("change"));
  mapped.document.querySelector("[name=originDetail]").value = "Yunnan";
  mapped.document
    .querySelector("[name=originDetail]")
    .dispatchEvent(new mapped.Event("input"));
  assert.equal(
    mapped.document.querySelector("[name=origin]").value,
    "China / Yunnan",
  );
  await mapped.document.querySelector("#form").onsubmit({
    preventDefault() {},
    target: mapped.document.querySelector("#form"),
  });
  const selectedOrigin = JSON.parse(mapped.localStorage.getItem("doujian-v1"))
    .beans[0];
  assert.equal(selectedOrigin.origin, "China / Yunnan");
  assert(!("originCountry" in selectedOrigin));
  const homeApp = app({}, true);
  assert.equal(homeApp.document.querySelector("#homeView").hidden, false);
  assert.equal(homeApp.document.querySelector(".collection").hidden, true);
  assert(
    homeApp.document
      .querySelector("[data-view=home]")
      .classList.contains("active"),
  );
  assert(
    homeApp.document
      .querySelector(".stats")
      .compareDocumentPosition(homeApp.document.querySelector(".hero")) & 4,
    "Stats must precede hero",
  );
  for (const page of ["beans", "brews", "favorites", "map"]) {
    homeApp.document.querySelector("[data-view=" + page + "]").click();
    assert.equal(homeApp.document.querySelector("#homeView").hidden, true);
    assert.equal(homeApp.document.querySelector(".collection").hidden, false);
  }
  homeApp.document.querySelector("[data-view=home]").click();
  homeApp.savePreference("language", "en");
  assert.equal(
    homeApp.document.querySelector(".overview-heading h2").textContent,
    "Overview",
  );
  assert.equal(homeApp.document.querySelector("#homeView").hidden, false);
  homeApp.document.querySelector("#newBrew").click();
  assert(homeApp.document.querySelector("#modal").open);
  setImmediate(() => homeApp.close());
  console.log(
    "PASS: default Home page, overview above hero, isolation from all work pages, English home labels and home action.",
  );
  console.log(
    "PASS: backups in settings; bilingual origin mapping; alias matching; multi-country blends; grouped hover info; unmapped records; navigation.",
  );
  for (const a of [w, reloaded, legacy, roastApp, mapped])
    setImmediate(() => a.close());
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

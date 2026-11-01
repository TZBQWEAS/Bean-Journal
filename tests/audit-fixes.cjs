const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const empty = () => ({
  beans: [],
  brews: [],
  devices: [],
  recipes: [],
  schemaVersion: 2,
});
function start(seed = empty()) {
  const dom = new JSDOM(fs.readFileSync("dist/index.html", "utf8"), {
      url: "http://audit.invalid",
      runScripts: "outside-only",
    }),
    w = dom.window;
  w.JOURNAL_SERVER = false;
  w.confirm = () => true;
  w.navigator.locks = { request: (_, fn) => Promise.resolve(fn()) };
  w.structuredClone = undefined;
  w.HTMLDialogElement.prototype.showModal = undefined;
  w.HTMLDialogElement.prototype.close = undefined;
  w.localStorage.setItem("doujian-v1", JSON.stringify(seed));
  const run = (s) => vm.runInContext(s, dom.getInternalVMContext());
  run("Object.hasOwn=undefined");
  for (const f of [
    "journal-model",
    "dialog-compat",
    "preferences",
    "samples",
    "map-data",
    "origin-map",
    "dashboard",
    "workbench",
    "app",
  ])
    run(fs.readFileSync("dist/" + f + ".js", "utf8"));
  return { w, run, close: () => w.close() };
}
(async () => {
  let c = start({
    ...empty(),
    brews: [
      {
        id: "old",
        beanId: "removed",
        beanName: "History",
        date: "2026-10-31",
        dose: "15",
        yield: "225",
        time: "150",
      },
    ],
  });
  try {
    c.run('view="beans";render()');
    c.w.document.querySelector("#demo").click();
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(c.run("data.brews.length"), 1);
    assert.equal(c.run("data.beans.length"), 2);
    c.run("render()");
    assert.equal(c.w.document.querySelectorAll("article.bean").length, 2);
  } finally {
    c.close();
  }
  for (const type of ["bean", "device"]) {
    c = start();
    try {
      c.run(
        'openForm("' +
          type +
          '"); let releaseSave; persist=next=>new Promise(resolve=>{releaseSave=()=>{data=next;resolve(true)}})',
      );
      c.w.document.querySelector("[name=name]").value = "Saving";
      const pending = c.w.document
        .querySelector("#form")
        .onsubmit({
          preventDefault() {},
          target: c.w.document.querySelector("#form"),
        });
      c.w.document.querySelector("#close").click();
      c.run('openWorkbenchForm("device")');
      c.w.document.querySelector("[name=name]").value = "Keep my draft";
      c.run("releaseSave()");
      await pending;
      assert.equal(c.w.document.querySelector("#modal").open, true);
      assert.equal(
        c.w.document.querySelector("[name=name]").value,
        "Keep my draft",
      );
      c.run('toast("保存失败：无法写入服务器，请检查服务和磁盘空间")');
      const toast = c.w.document.querySelector("#toast");
      assert.equal(toast.parentElement, c.w.document.querySelector("#modal"));
      assert(!toast.hasAttribute("aria-hidden"));
      assert(!toast.hasAttribute("inert"));
    } finally {
      c.close();
    }
  }
  c = start();
  try {
    let revoked = 0;
    c.w.URL.createObjectURL = () => "blob:test";
    c.w.URL.revokeObjectURL = () => revoked++;
    c.w.Image = class {
      constructor() {
        this.width = 2;
        this.height = 2;
      }
      set src(v) {
        queueMicrotask(() => this.onload());
      }
    };
    c.w.HTMLCanvasElement.prototype.getContext = () => ({
      fillRect() {},
      drawImage() {},
    });
    c.w.HTMLCanvasElement.prototype.toDataURL = () =>
      "data:image/jpeg;base64,YQ==";
    assert.equal(
      await c.run('resizePhoto(new Blob(["x"],{type:"image/jpeg"}))'),
      "data:image/jpeg;base64,YQ==",
    );
    assert.equal(revoked, 1);
    c.w.Image = class {
      set src(v) {
        queueMicrotask(() => this.onerror());
      }
    };
    await assert.rejects(c.run('resizePhoto(new Blob(["bad"]))'));
    assert.equal(revoked, 2);
    let signal;
    c.w.fetch = (_, options) => {
      signal = options.signal;
      return new Promise(() => {});
    };
    await assert.rejects(c.run("requestJournal({},10)"), /timeout/);
    assert.equal(signal.aborted, true);
    c.w.fetch = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => new Promise(() => {}),
      });
    await assert.rejects(c.run("requestJournal({},10)"), /timeout/);
    c.w.fetch = () => Promise.resolve(new Response('{"ok":true}'));
    assert.equal((await c.run("requestJournal({},100)")).body.ok, true);
  } finally {
    c.close();
  }
  // A previously valid >64 MB snapshot can be imported without the old decimal cutoff.
  c = start();
  try {
    c.run("persist=async value=>{data=value;return true}");
    const text = JSON.stringify({
      ...empty(),
      beans: Array.from({ length: 45 }, (_, i) => ({
        id: "b" + i,
        name: "Bean",
        photo: "data:image/jpeg;base64," + "A".repeat(1450000),
      })),
    });
    assert(Buffer.byteLength(text) > 64000000);
    // Run the import handler with serverMode true in a separate lexical evaluation of its exact function.
    const source = fs.readFileSync("dist/app.js", "utf8");
    const handler = source.slice(
      source.indexOf('$("#importFile").onchange = async'),
      source.indexOf("const mobileMenuToggle"),
    );
    c.run(handler.replace("serverMode ?", "true ?"));
    await c.w.document
      .querySelector("#importFile")
      .onchange({
        target: {
          files: [{ size: Buffer.byteLength(text), text: async () => text }],
          value: "backup",
        },
      });
    assert.equal(c.run("data.beans.length"), 45);
  } finally {
    c.close();
  }
  console.log(
    "PASS: history-safe samples, absent Object.hasOwn, old saves preserve new drafts, visible dialog errors, fallback photo decoding/cleanup, header/body timeout and retry, large backup import.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

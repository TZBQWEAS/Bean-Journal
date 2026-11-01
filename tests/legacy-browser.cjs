const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
async function check(serverMode) {
  const dom = new JSDOM(fs.readFileSync("dist/index.html", "utf8"), {
      url: "http://192.168.1.10:8890",
      runScripts: "outside-only",
    }),
    w = dom.window;
  try {
    w.JOURNAL_SERVER = serverMode;
    w.structuredClone = undefined;
    w.HTMLDialogElement.prototype.showModal = undefined;
    w.HTMLDialogElement.prototype.close = undefined;
    delete w.HTMLDialogElement.prototype.open;
    w.HTMLDialogElement = undefined;
    w.navigator.locks = { request: (_, fn) => Promise.resolve(fn()) };
    w.confirm = () => true;
    let snapshot = {
      instanceId: "compat-test",
      revision: 1,
      journal: {
        beans: [],
        brews: [],
        devices: [],
        recipes: [],
        schemaVersion: 2,
      },
    };
    w.fetch = async (_, init = {}) => {
      if (init.method === "PUT") {
        const body = JSON.parse(init.body);
        snapshot = {
          ...snapshot,
          revision: snapshot.revision + 1,
          journal: body.journal,
        };
      }
      return new Response(JSON.stringify(snapshot));
    };
    const run = (s) => vm.runInContext(s, dom.getInternalVMContext());
    for (const name of [
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
      run(fs.readFileSync("dist/" + name + ".js", "utf8"));
    for (let i = 0; i < 30 && run("serverLoading"); i++)
      await new Promise((r) => setTimeout(r, 5));
    run(
      "const original={a:[{v:1}],missing:undefined}; const cloned=cloneJournal(original); cloned.a[0].v=2",
    );
    assert.equal(run("original.a[0].v"), 1);
    assert.equal(run("cloneJournal(undefined)"), undefined);
    w.document.querySelector("#addBean").focus();
    run('openForm("bean")');
    const dialog = w.document.querySelector("#modal");
    assert.equal(dialog.open, true);
    assert.equal(
      w.document.querySelectorAll(".legacy-dialog-backdrop").length,
      1,
    );
    assert.equal(w.document.body.style.overflow, "hidden");
    w.document.querySelector("[name=name]").value = "Legacy browser bean";
    await w.document
      .querySelector("#form")
      .onsubmit({
        preventDefault() {},
        target: w.document.querySelector("#form"),
      });
    assert.equal(dialog.open, false);
    assert.equal(run("data.beans.length"), 1);
    run('openWorkbenchForm("device")');
    w.document.querySelector("[name=name]").value = "Old Safari machine";
    await w.document
      .querySelector("#form")
      .onsubmit({
        preventDefault() {},
        target: w.document.querySelector("#form"),
      });
    assert.equal(run("data.devices.length"), 1);
    run('openWorkbenchForm("device",data.devices[0])');
    await w.document.querySelector("#delete").onclick();
    assert.equal(run("data.devices[0].archived"), true);
    const focus = w.document.querySelector("#settingsButton");
    focus.focus();
    focus.click();
    const settings = w.document.querySelector("#settingsDialog");
    assert.equal(settings.open, true);
    const last = settings.querySelector("#import");
    last.focus();
    w.document.dispatchEvent(
      new w.KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    );
    assert.equal(
      w.document.activeElement,
      settings.querySelector("#closeSettings"),
    );
    let closed = 0;
    settings.addEventListener("close", () => closed++);
    const cancel = (e) => e.preventDefault();
    settings.addEventListener("cancel", cancel);
    w.document.dispatchEvent(
      new w.KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    assert.equal(settings.open, true);
    settings.removeEventListener("cancel", cancel);
    w.document.dispatchEvent(
      new w.KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    assert.equal(settings.open, false);
    assert.equal(closed, 1);
    assert.equal(w.document.activeElement, focus);
    assert.equal(w.document.body.style.overflow, "");
    assert.equal(
      w.document.querySelectorAll(".legacy-dialog-backdrop").length,
      0,
    );
    assert.equal(
      w.document.querySelector("main").hasAttribute("aria-hidden"),
      false,
    );
    assert.equal(run("validateJournalBackup(data).beans.length"), 1);
    if (serverMode) assert.equal(snapshot.journal.devices[0].archived, true);
  } finally {
    w.close();
  }
}
(async () => {
  await check(false);
  await check(true);
  const dom = new JSDOM("<dialog></dialog>", { runScripts: "outside-only" });
  const w = dom.window;
  const show = function () {},
    close = function () {};
  const d = w.document.querySelector("dialog");
  d.showModal = show;
  d.close = close;
  vm.runInContext(
    fs.readFileSync("dist/dialog-compat.js", "utf8"),
    dom.getInternalVMContext(),
  );
  assert.equal(d.showModal, show);
  assert.equal(d.close, close);
  assert.equal(
    w.document.documentElement.classList.contains("legacy-dialogs"),
    false,
  );
  w.close();
  console.log(
    "PASS: missing structuredClone and dialog APIs; local/server saves, equipment deactivation, clone isolation, calendar form validation, focus trap, cancel/Escape, close events and native API preservation.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

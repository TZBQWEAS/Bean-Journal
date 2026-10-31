const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const { validateJournalBackup } = require("../dist/journal-model.js");
const seed = () => ({
  beans: [{ id: "bean", name: "Test" }],
  brews: [],
  devices: [
    { id: "machine", name: "Machine", type: "machine", archived: false },
  ],
  recipes: [],
  schemaVersion: 2,
});
async function start({ missingConfig = false, fail = false } = {}) {
  let snapshot = { instanceId: "first-server", revision: 10, journal: seed() };
  const dom = new JSDOM(fs.readFileSync("dist/index.html", "utf8"), {
      url: "http://audit.invalid",
      runScripts: "outside-only",
    }),
    w = dom.window;
  if (!missingConfig) w.JOURNAL_SERVER = true;
  w.structuredClone = structuredClone;
  w.confirm = () => false;
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.fetch = async (_, init = {}) => {
    if (fail) throw Error("unavailable");
    if (init.method === "PUT") {
      const body = JSON.parse(init.body);
      if (
        body.expectedInstance !== snapshot.instanceId ||
        body.expectedRevision !== snapshot.revision
      )
        return new Response("{}", { status: 409 });
      snapshot = {
        ...snapshot,
        revision: snapshot.revision + 1,
        journal: validateJournalBackup(body.journal),
      };
    }
    return new Response(JSON.stringify(snapshot), { status: 200 });
  };
  const run = (s) => vm.runInContext(s, dom.getInternalVMContext());
  for (const f of [
    "journal-model",
    "preferences",
    "samples",
    "map-data",
    "origin-map",
    "dashboard",
    "workbench",
    "app",
  ])
    run(fs.readFileSync("dist/" + f + ".js", "utf8"));
  for (let i = 0; i < 30 && run("serverLoading"); i++)
    await new Promise((r) => setTimeout(r, 5));
  return {
    w,
    run,
    get: () => snapshot,
    set: (v) => (snapshot = v),
    close: () => w.close(),
  };
}
(async () => {
  for (const change of [{ archived: true }, { type: "grinder" }]) {
    const c = await start();
    try {
      c.run('openWorkbenchForm("brew")');
      const select = c.w.document.querySelector("[name=machineId]");
      select.value = "machine";
      select.dispatchEvent(new c.w.Event("change"));
      const newer = structuredClone(c.get());
      newer.revision++;
      Object.assign(newer.journal.devices[0], change);
      c.set(newer);
      await c.w.document
        .querySelector("#form")
        .onsubmit({
          preventDefault() {},
          target: c.w.document.querySelector("#form"),
        });
      assert.equal(c.get().journal.brews.length, 0);
      assert.equal(c.w.document.querySelector("#modal").open, true);
      assert.equal(select.value, "machine");
    } finally {
      c.close();
    }
  }
  const c = await start();
  try {
    c.run('openWorkbenchForm("device", data.devices[0])');
    const restored = {
      instanceId: "restored-server",
      revision: 2,
      journal: seed(),
    };
    restored.journal.beans[0].name = "Restored backup";
    c.set(restored);
    assert.equal(
      await c.run(
        'persist({...data,devices:data.devices.map(d=>({...d,name:"Old draft"}))})',
      ),
      false,
    );
    assert.equal(c.run("data.beans[0].name"), "Restored backup");
    assert.equal(c.run("serverRevision"), 2);
    // An old form cannot be submitted again after the new instance was accepted.
    assert.equal(
      await c.run(
        'persist({...data,devices:data.devices.map(d=>({...d,name:"Old draft"}))})',
      ),
      false,
    );
    c.run(
      'document.querySelector("#modal").close(); openWorkbenchForm("device", data.devices[0])',
    );
    assert.equal(
      await c.run(
        'persist({...data,devices:data.devices.map(d=>({...d,name:"Fresh edit"}))})',
      ),
      true,
    );
    assert.equal(c.run("data.devices[0].name"), "Fresh edit");
    c.run('document.querySelector("#modal").close()');
    c.set({ instanceId: "another-restore", revision: 1, journal: seed() });
    await c.run("refreshServerJournal(true)");
    assert.equal(c.run("serverRevision"), 1);
    // A delayed old-process response cannot replace a newer response.
    c.run(
      'acceptServerSnapshot({instanceId:"first-server",revision:99,requestId:1,journal:{beans:[],brews:[],devices:[],recipes:[],schemaVersion:2}})',
    );
    assert.equal(c.run("serverInstance"), "another-restore");
    assert.equal(
      await c.run(
        'persist({...data,beans:[...data.beans,{id:"new",name:"New"}]})',
      ),
      true,
    );
    assert.equal(c.run("data.beans.length"), 2);
  } finally {
    c.close();
  }
  for (const fail of [false, true]) {
    const c = await start({ missingConfig: true, fail });
    try {
      assert.equal(c.run("serverMode"), true);
      const saved = await c.run(
        'persist({...data,beans:[...data.beans,{id:"new",name:"Entry"}]})',
      );
      assert.equal(saved, !fail);
      assert.equal(c.w.localStorage.getItem("doujian-v1"), null);
    } finally {
      c.close();
    }
  }
  console.log(
    "PASS: missing mode configuration fails closed, remote equipment changes reject stale selections, database restore refreshes and protects drafts, delayed old responses ignored.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

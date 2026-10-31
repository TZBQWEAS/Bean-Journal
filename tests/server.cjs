const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");
const { createJournalServer } = require("../server/index.cjs");
const { openStore } = require("../server/store.cjs");
const empty = () => ({
  beans: [],
  brews: [],
  devices: [],
  recipes: [],
  schemaVersion: 2,
});
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bean-sync-test-"));
const windows = [];
const instance = createJournalServer({
  dataDir: directory,
  maxBodyBytes: 100000,
});
let url;
const headers = { "Content-Type": "application/json", "X-Bean-Journal": "1" };
const put = async (journal, expectedRevision, extra = {}) =>
  fetch(url + "/api/journal", {
    method: "PUT",
    headers: { ...headers, ...extra },
    body: JSON.stringify({
      journal,
      expectedRevision,
      expectedInstance: (await read()).instanceId,
    }),
  });
const read = () => fetch(url + "/api/journal").then((r) => r.json());
async function client(legacy, confirm = false) {
  const dom = new JSDOM(
    fs.readFileSync(path.join(__dirname, "../dist/index.html"), "utf8"),
    { url, runScripts: "outside-only" },
  );
  windows.push(dom.window);
  const w = dom.window;
  w.JOURNAL_SERVER = true;
  w.structuredClone = structuredClone;
  w.confirm = () => confirm;
  w.fetch = (input, init) => fetch(new URL(input, url), init);
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  if (legacy) w.localStorage.setItem("doujian-v1", JSON.stringify(legacy));
  const run = (s) => vm.runInContext(s, dom.getInternalVMContext());
  for (const file of [
    "journal-model",
    "preferences",
    "samples",
    "map-data",
    "origin-map",
    "dashboard",
    "workbench",
    "app",
  ])
    run(fs.readFileSync(path.join(__dirname, "../dist", file + ".js"), "utf8"));
  for (let i = 0; i < 100 && !run("serverReady && !serverLoading"); i++)
    await new Promise((r) => setTimeout(r, 10));
  assert.equal(run("serverReady"), true);
  return { w, run };
}
(async () => {
  await new Promise((r) => instance.server.listen(0, "127.0.0.1", r));
  url = "http://127.0.0.1:" + instance.server.address().port;
  assert.equal((await read()).revision, 0);
  assert.match(await (await fetch(url + "/runtime-config.js")).text(), /true/);
  const legacy = {
    ...empty(),
    beans: [
      {
        id: "old",
        name: "Old local bean",
        photo: "data:image/png;base64,YQ==",
      },
    ],
  };
  const a = await client(legacy, true);
  assert.equal((await read()).journal.beans[0].id, "old");
  assert.equal(a.w.localStorage.getItem("doujian-v1"), JSON.stringify(legacy));
  const b = await client(
    { ...empty(), beans: [{ id: "ignored", name: "Do not auto merge" }] },
    true,
  );
  assert.equal(b.run("data.beans.length"), 1);
  const results = await Promise.all([
    a.run('persist({...data,beans:[...data.beans,{id:"a",name:"Phone"}]})'),
    b.run('persist({...data,beans:[...data.beans,{id:"b",name:"Tablet"}]})'),
  ]);
  assert.deepEqual(results, [true, true]);
  let snap = await read();
  assert.equal(snap.journal.beans.length, 3);
  assert.equal(snap.journal.beans[0].photo, legacy.beans[0].photo);
  await a.run("refreshServerJournal(true)");
  await b.run("refreshServerJournal(true)");
  assert.equal(a.run("data.beans.length"), 3);
  assert.equal(
    await a.run(
      'persist({...data,devices:[{id:"equipment",name:"Machine",type:"machine",brand:"Brand",model:"X",purchasePrice:"123.45",currency:"AUD",purchaseDate:"2026-10-31"}]})',
    ),
    true,
  );
  await b.run("refreshServerJournal(true)");
  assert.equal(b.run("data.devices[0].purchasePrice"), "123.45");
  assert.equal(b.run("data.devices[0].brand"), "Brand");
  assert.equal(
    await b.run(
      'persist({...data,devices:data.devices.map(d=>({...d,type:"grinder"}))})',
    ),
    true,
  );
  await a.run("refreshServerJournal(true)");
  assert.equal(a.run("data.devices[0].type"), "grinder");
  a.run('captureFormBaseline("bean","old")');
  b.run('captureFormBaseline("bean","old")');
  assert.equal(
    await a.run(
      'persist({...data,beans:data.beans.map(b=>b.id==="old"?{...b,name:"Changed"}:b)})',
    ),
    true,
  );
  assert.equal(
    await b.run(
      'persist({...data,beans:data.beans.map(b=>b.id==="old"?{...b,name:"Stale"}:b)})',
    ),
    false,
  );
  assert.equal((await read()).journal.beans[0].name, "Changed");
  snap = await read();
  assert.equal((await put(snap.journal, snap.revision - 1)).status, 409);
  assert.equal((await put({ beans: [] }, snap.revision)).status, 400);
  assert.equal(
    (
      await put(snap.journal, snap.revision, {
        Origin: "https://elsewhere.invalid",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(url + "/api/journal", {
        method: "PUT",
        headers,
        body: "null",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(url + "/api/journal", {
        headers: {
          "If-None-Match": '"' + snap.instanceId + ":" + snap.revision + '"',
        },
      })
    ).status,
    304,
  );
  for (const file of [
    "/data/journal.sqlite",
    "/server/store.cjs",
    "/.env",
    "/%2e%2e%5cpackage.json",
  ])
    assert.equal((await fetch(url + file)).status, 404);
  assert.equal(
    (
      await fetch(url + "/api/journal", {
        method: "PUT",
        headers,
        body: JSON.stringify({ huge: "x".repeat(110000) }),
      })
    ).status,
    413,
  );
  assert.equal((await read()).revision, snap.revision);
  // A complete restore invalidates another device's old editing baseline.
  a.run("formBaseline=null");
  b.run("formBaseline=null");
  await a.run("refreshServerJournal(true)");
  await b.run("refreshServerJournal(true)");
  assert.equal(await a.run("persist(data,{replace:true})"), true);
  assert.equal(
    await b.run(
      'persist({...data,beans:[...data.beans,{id:"stale-new",name:"Old generation"}]})',
    ),
    false,
  );
  // Server errors never fall back to writing private browser data.
  const localBefore = a.w.localStorage.getItem("doujian-v1");
  a.w.fetch = () => Promise.reject(Error("server unavailable"));
  assert.equal(
    await a.run(
      'persist({...data,beans:[...data.beans,{id:"fail",name:"Failed"}]})',
    ),
    false,
  );
  assert.equal(a.w.localStorage.getItem("doujian-v1"), localBefore);
  const final = await read();
  windows.forEach((w) => w.close());
  await new Promise((r) => instance.server.close(r));
  instance.store.close();
  const restarted = createJournalServer({ dataDir: directory });
  try {
    await new Promise((r) => restarted.server.listen(0, "127.0.0.1", r));
    const endpoint =
      "http://127.0.0.1:" + restarted.server.address().port + "/api/journal";
    const reply = await fetch(endpoint, {
      headers: {
        "If-None-Match": '"' + final.instanceId + ":" + final.revision + '"',
      },
    });
    assert.equal(reply.status, 200);
    const fresh = await reply.json();
    assert.notEqual(fresh.instanceId, final.instanceId);
    assert.equal(fresh.revision, final.revision);
    assert.equal(
      (
        await fetch(endpoint, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            journal: final.journal,
            expectedRevision: final.revision,
            expectedInstance: final.instanceId,
          }),
        })
      ).status,
      409,
    );
    assert.deepEqual(
      (await (await fetch(endpoint)).json()).journal,
      final.journal,
    );
  } finally {
    await new Promise((r) => restarted.server.close(r));
    restarted.store.close();
  }
  const reopened = openStore(directory);
  const { instanceId, ...storedFinal } = final;
  assert.deepEqual(reopened.read(), storedFinal);
  reopened.close();
  console.log(
    "PASS: SQLite persistence, legacy import, two-device refresh and concurrent saves, stale edits, restore generations, photo round-trip, failed saves, API validation, CSRF rejection, ETag and private-file isolation.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    windows.forEach((w) => w.close());
    if (instance.server.listening) {
      await new Promise((r) => instance.server.close(r));
      instance.store.close();
    }
    fs.rmSync(directory, { recursive: true, force: true });
  });

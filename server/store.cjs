"use strict";
const { DatabaseSync } = require("node:sqlite");
const { mkdirSync } = require("node:fs");
const path = require("node:path");
const { validateJournalBackup } = require("../dist/journal-model.js");
const lists = ["beans", "brews", "devices", "recipes"];
const empty = () => ({
  beans: [],
  brews: [],
  devices: [],
  recipes: [],
  schemaVersion: 2,
});
function openStore(directory) {
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, "journal.sqlite"));
  db.exec(
    "PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;",
  );
  const schema = db.prepare("PRAGMA user_version").get().user_version;
  if (schema > 1) {
    db.close();
    throw new Error("Database belongs to a newer server version");
  }
  db.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS metadata (
      id INTEGER PRIMARY KEY CHECK(id=1),
      revision INTEGER NOT NULL,
      generation TEXT NOT NULL
    );
    INSERT OR IGNORE INTO metadata VALUES (1,0,'');
    CREATE TABLE IF NOT EXISTS records (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      position INTEGER NOT NULL,
      body TEXT NOT NULL,
      PRIMARY KEY(collection,id)
    );
    PRAGMA user_version=1;
    COMMIT;
  `);
  const readMeta = db.prepare(
    "SELECT revision,generation FROM metadata WHERE id=1",
  );
  const readRows = db.prepare(
    "SELECT collection,body FROM records ORDER BY collection,position",
  );
  const put = db.prepare(
    "INSERT INTO records(collection,id,position,body) VALUES(?,?,?,?)",
  );
  function read() {
    db.exec("BEGIN");
    try {
      const meta = readMeta.get(),
        journal = empty();
      for (const row of readRows.all())
        journal[row.collection].push(JSON.parse(row.body));
      if (meta.generation) journal.generation = meta.generation;
      db.exec("COMMIT");
      return { revision: meta.revision, journal };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  function save(input, expectedRevision) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
      throw Object.assign(Error("invalid"), { status: 400 });
    let journal;
    try {
      journal = validateJournalBackup(input);
      const all = lists.flatMap((list) => journal[list]);
      if (
        all.length > 10000 ||
        all.some(
          (row) =>
            row.id.length > 200 ||
            Object.entries(row).some(
              ([key, value]) =>
                key.length > 100 ||
                (typeof value === "string" &&
                  key !== "photo" &&
                  value.length > 20000),
            ),
        )
      )
        throw Error("invalid");
    } catch {
      throw Object.assign(Error("invalid"), { status: 400 });
    }
    db.exec("BEGIN IMMEDIATE");
    try {
      if (readMeta.get().revision !== expectedRevision)
        throw Object.assign(Error("conflict"), { status: 409 });
      db.exec("DELETE FROM records");
      for (const list of lists)
        journal[list].forEach((row, index) =>
          put.run(list, row.id, index, JSON.stringify(row)),
        );
      const revision = expectedRevision + 1;
      db.prepare("UPDATE metadata SET revision=?,generation=? WHERE id=1").run(
        revision,
        journal.generation || "",
      );
      db.exec("COMMIT");
      return { revision, journal };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return {
    read,
    save,
    revision: () => readMeta.get().revision,
    close: () => db.close(),
  };
}
module.exports = { openStore };

// Shared browser/server validation and merge rules.
const parameterKeys = [
  "method",
  "grind",
  "dose",
  "yield",
  "time",
  "temperature",
  "machineId",
  "machine",
  "grinderId",
  "grinder",
];

function safePhoto(value) {
  return (
    typeof value === "string" &&
    value.length < 1500000 &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)
  );
}

function validDateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return (
    d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
  );
}

function normalizeJournal(input) {
  const next = {
    ...input,
    devices: input.devices || [],
    recipes: input.recipes || [],
    schemaVersion: 2,
  };
  next.brews = next.brews.map((b) => ({ ...b }));
  if (!input.schemaVersion || input.schemaVersion < 2) {
    for (const b of next.brews) {
      if (!b.favorite) continue;
      const id = "legacy-recipe-" + b.id;
      if (!next.recipes.some((r) => r.id === id)) {
        const bean = next.beans.find((x) => x.id === b.beanId);
        const recipe = {
          id,
          name: (bean?.name || "Coffee") + " · " + (b.method || "手冲"),
          beanId: b.beanId,
          notes: b.notes || "",
        };
        for (const k of parameterKeys) recipe[k] = b[k] || "";
        next.recipes.push(recipe);
      }
      if (!b.recipeId) {
        b.recipeId = id;
        b.recipeName = next.recipes.find((r) => r.id === id).name;
      }
    }
  }
  return next;
}

function validateJournalBackup(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj))
    throw Error("invalid");
  for (const list of ["beans", "brews"])
    if (!Array.isArray(obj[list])) throw Error("invalid");
  for (const list of ["devices", "recipes"])
    if (obj[list] !== undefined && !Array.isArray(obj[list]))
      throw Error("invalid");
  if (
    obj.schemaVersion !== undefined &&
    (!Number.isInteger(obj.schemaVersion) ||
      obj.schemaVersion < 1 ||
      obj.schemaVersion > 2)
  )
    throw Error("invalid");
  if (obj.generation !== undefined && typeof obj.generation !== "string")
    throw Error("invalid");
  const all = [
    ...obj.beans,
    ...obj.brews,
    ...(obj.devices || []),
    ...(obj.recipes || []),
  ];
  if (
    all.some(
      (x) =>
        !x ||
        Array.isArray(x) ||
        typeof x.id !== "string" ||
        !x.id ||
        Object.values(x).some(
          (v) => !["string", "number", "boolean"].includes(typeof v),
        ),
    ) ||
    new Set(all.map((x) => x.id)).size !== all.length
  )
    throw Error("invalid");
  const textFields = [
    "name",
    "origin",
    "originCountryId",
    "roast",
    "roaster",
    "process",
    "flavors",
    "notes",
    "photo",
    "roastDate",
    "sampleKey",
    "beanType",
    "beanId",
    "beanName",
    "method",
    "date",
    "timeOfDay",
    "grind",
    "grinder",
    "grinderId",
    "machine",
    "machineId",
    "recipeId",
    "recipeName",
    "type",
    "model",
    "brand",
    "currency",
    "purchaseDate",
  ];
  for (const record of all) {
    for (const key of textFields)
      if (record[key] !== undefined && typeof record[key] !== "string")
        throw Error("invalid");
    for (const key of ["archived", "favorite"])
      if (record[key] !== undefined && typeof record[key] !== "boolean")
        throw Error("invalid");
  }
  function numeric(value, min, max, optional = false) {
    if (optional && (value === undefined || value === "")) return true;
    if (
      !["string", "number"].includes(typeof value) ||
      String(value).trim() === ""
    )
      return false;
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max;
  }
  for (const b of obj.beans) {
    if (
      !b.name?.trim() ||
      (b.flavors !== undefined && typeof b.flavors !== "string") ||
      (b.photo && !safePhoto(b.photo)) ||
      (b.roastDate && !validDateValue(b.roastDate)) ||
      !numeric(b.weight, 0.1, 1000000, true)
    )
      throw Error("invalid");
  }
  for (const record of [...obj.brews, ...(obj.recipes || [])]) {
    if (
      !numeric(record.dose, 0.1, 5000) ||
      !numeric(record.yield, 0.1, 50000) ||
      !numeric(record.time, 1, 604800) ||
      !Number.isInteger(Number(record.time)) ||
      !numeric(record.temperature, 0, 100, true) ||
      !numeric(record.rating, 1, 5, true) ||
      (record.rating !== undefined &&
        record.rating !== "" &&
        !Number.isInteger(Number(record.rating)))
    )
      throw Error("invalid");
    if (
      record.method !== undefined &&
      ![
        "手冲",
        "意式浓缩",
        "爱乐压",
        "法压壶",
        "摩卡壶",
        "冷萃",
        "其他",
        "",
      ].includes(record.method)
    )
      throw Error("invalid");
  }
  for (const b of obj.brews) {
    if (
      !validDateValue(b.date) ||
      typeof b.beanId !== "string" ||
      !b.beanId ||
      (!obj.beans.some((bean) => bean.id === b.beanId) &&
        !b.beanName?.trim()) ||
      (b.timeOfDay && !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.timeOfDay))
    )
      throw Error("invalid");
  }
  for (const d of obj.devices || [])
    if (
      !d.name?.trim() ||
      !["machine", "grinder"].includes(d.type) ||
      !numeric(d.purchasePrice, 0, 1000000000000, true) ||
      (d.purchaseDate && !validDateValue(d.purchaseDate)) ||
      (d.currency && d.currency.length > 20) ||
      (d.brand && d.brand.length > 100)
    )
      throw Error("invalid");
  for (const r of obj.recipes || [])
    if (!r.name?.trim()) throw Error("invalid");
  const result = normalizeJournal(
    structuredClone({
      beans: obj.beans,
      brews: obj.brews,
      devices: obj.devices || [],
      recipes: obj.recipes || [],
      schemaVersion: obj.schemaVersion || 1,
      ...(obj.generation ? { generation: obj.generation } : {}),
    }),
  );
  return result;
}

function sameRecord(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mergeJournal(base, wanted, current, baseline) {
  if ((base.generation || "") !== (current.generation || ""))
    throw Error("conflict");
  if (
    baseline &&
    !sameRecord(
      current[baseline.list].find((r) => r.id === baseline.id),
      baseline.record,
    )
  )
    throw Error("conflict");
  const merged = { ...current };
  for (const list of ["beans", "brews", "devices", "recipes"]) {
    const before = new Map(base[list].map((r) => [r.id, r])),
      after = new Map(wanted[list].map((r) => [r.id, r])),
      latest = new Map(current[list].map((r) => [r.id, r]));
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const old = before.get(id),
        next = after.get(id);
      if (sameRecord(old, next)) continue;
      const expected =
        baseline?.list === list && baseline.id === id ? baseline.record : old;
      if (!sameRecord(latest.get(id), expected)) throw Error("conflict");
      if (next) latest.set(id, next);
      else latest.delete(id);
    }
    merged[list] = [...latest.values()];
  }
  // New equipment selections must still be active and match the selected role.
  // Unchanged historical links remain valid after deactivation or type changes.
  for (const list of ["brews", "recipes"]) {
    for (const record of wanted[list]) {
      const old = base[list].find((r) => r.id === record.id);
      if (sameRecord(old, record)) continue;
      for (const role of ["machine", "grinder"]) {
        const id = record[role + "Id"];
        if (!id || old?.[role + "Id"] === id) continue;
        const device = current.devices.find((d) => d.id === id);
        if (!device || device.archived || device.type !== role)
          throw Error("conflict");
      }
    }
  }
  merged.schemaVersion = 2;
  return merged;
}

if (typeof module !== "undefined")
  module.exports = {
    normalizeJournal,
    validateJournalBackup,
    sameRecord,
    mergeJournal,
  };

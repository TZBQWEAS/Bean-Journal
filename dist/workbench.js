Object.assign(dictionary, {
  我的设备: "My equipment",
  添加设备: "Add equipment",
  编辑设备: "Edit equipment",
  "设备名称 *": "Equipment name *",
  设备类型: "Equipment type",
  咖啡机: "Coffee machine",
  磨豆机: "Grinder",
  "品牌 / 型号": "Brand / Model",
  设备备注: "Equipment notes",
  在用: "Active",
  已停用: "Inactive",
  停用设备: "Deactivate equipment",
  重新启用: "Reactivate",
  "添加你的咖啡机和磨豆机，记录时直接选择。":
    "Add your coffee machines and grinders to select them when brewing.",
  设备库: "EQUIPMENT LIBRARY",
  "长期保存的参数，随时冲出下一杯":
    "Reusable parameters for your next great cup",
  新建配方: "New recipe",
  编辑配方: "Edit recipe",
  "配方名称 *": "Recipe name *",
  "配方步骤 / 要点": "Recipe steps / Tips",
  "推荐豆卡（可选）": "Suggested beans (optional)",
  不限豆子: "Any beans",
  目标参数: "Target parameters",
  使用配方冲一杯: "Brew this recipe",
  保存为配方: "Save as recipe",
  从这杯提炼配方: "Create recipe from this brew",
  "配方是可反复使用的方案；每次冲煮单独记录实际结果。":
    "Recipes are reusable plans. Each brew records its own actual results.",
  还没有配方: "No recipes yet",
  "创建一份长期使用的配方，也可从任意冲煮记录保存。":
    "Create a reusable recipe, or save one from any brew record.",
  "每一次冲煮，都是独立的记录": "A separate record for every cup",
  使用的配方: "Recipe used",
  不使用配方: "No recipe",
  "选择配方会填入目标参数，你可以调整为本次实际值。":
    "Selecting a recipe fills its target parameters. Adjust them to your actual brew.",
  实际参数: "Actual parameters",
  "咖啡机（可选）": "Coffee machine (optional)",
  "磨豆机（可选）": "Grinder (optional)",
  不选择设备: "No equipment selected",
  历史设备: "Historical equipment",
  历史配方: "Historical recipe",
  本次时间: "Time of brew",
  配方: "Recipe",
  自由冲煮: "Free brew",
  使用次数: "Times brewed",
  尚未使用: "Not used yet",
  设备名称不能为空: "Equipment name is required.",
  配方名称不能为空: "Recipe name is required.",
  "删除配方？已有冲煮记录和实际参数会保留。":
    "Delete this recipe? Existing brews and their actual parameters will be kept.",
  已保存设备: "Equipment saved.",
  已保存配方: "Recipe saved.",
  已保存本次冲煮: "Brew saved.",
  请先添加豆卡: "Add beans first.",
  暂无设备: "No equipment yet",
  "搜索设备、配方或记录…": "Search equipment, recipes or records…",
  删除配方: "Delete recipe",
  "停用后不会出现在新记录的设备列表，历史记录仍会保留。":
    "Inactive equipment is hidden from new selections. Past records are preserved.",
  "导出包含豆卡、照片、设备、配方和冲煮记录；导入会替换当前记录。":
    "Exports include beans, photos, equipment, recipes and brews. Import replaces current records.",
  "导入会替换当前全部豆卡、设备、配方和冲煮记录。建议先导出备份。继续？":
    "Import replaces all beans, equipment, recipes and brews. Export a backup first. Continue?",
});
for (const [zh, en] of Object.entries(dictionary)) reverseDictionary[en] = zh;
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
function parameterFields(item) {
  return (
    select(
      "冲煮方式",
      "method",
      ["手冲", "意式浓缩", "爱乐压", "法压壶", "摩卡壶", "冷萃", "其他"],
      item.method,
    ) +
    field(
      "研磨度 / 刻度",
      "grind",
      item.grind,
      "text",
      'placeholder="如：18 格 / 2.5 圈"',
    ) +
    field(
      "粉重（g） *",
      "dose",
      item.dose || 15,
      "number",
      'required min="0.1" max="5000" step="0.1"',
    ) +
    field(
      "液重 / 注水量（g） *",
      "yield",
      item.yield || 225,
      "number",
      'required min="0.1" max="50000" step="0.1"',
    ) +
    field(
      "萃取时间（秒） *",
      "time",
      item.time || 150,
      "number",
      'required min="1" max="604800" step="1"',
    ) +
    field(
      "水温（°C）",
      "temperature",
      item.temperature || 92,
      "number",
      'min="0" max="100" step="0.1"',
    )
  );
}
function beanSelect(item, required) {
  return `<label class="wide">${tr(required ? "选择豆卡 *" : "推荐豆卡（可选）")}<select name="beanId" ${required ? "required" : ""}>${required ? "" : `<option value="">${tr("不限豆子")}</option>`}${data.beans
    .map(localizedBean)
    .map(
      (b) =>
        `<option data-user value="${esc(b.id)}" ${b.id === item.beanId ? "selected" : ""}>${esc(b.name)}</option>`,
    )
    .join(
      "",
    )}${item.beanId && !data.beans.some((b) => b.id === item.beanId) ? `<option value="${esc(item.beanId)}" selected>${esc(item.beanName || tr("已删除豆卡"))}</option>` : ""}</select></label>`;
}
function equipmentSelect(type, item) {
  const key = type === "machine" ? "machine" : "grinder",
    id = item[key + "Id"] || "",
    snapshot = item[key] || "",
    options = data.devices.filter(
      (d) => d.type === type && (!d.archived || d.id === id),
    );
  let choices = options
    .map(
      (d) =>
        `<option data-user value="${esc(d.id)}" ${id === d.id ? "selected" : ""}>${esc(d.name)}${d.archived ? " (" + tr("已停用") + ")" : ""}</option>`,
    )
    .join("");
  if (id && !options.some((d) => d.id === id))
    choices += `<option data-user value="${esc(id)}" selected>${esc(snapshot || tr("历史设备"))}</option>`;
  else if (!id && snapshot)
    choices += `<option data-user value="legacy" selected>${esc(snapshot)}</option>`;
  return `<label>${tr(key === "machine" ? "咖啡机（可选）" : "磨豆机（可选）")}<select name="${key}Id"><option value="">${tr("不选择设备")}</option>${choices}</select><input type="hidden" name="${key}" value="${esc(snapshot)}"></label>`;
}
function recipeSelect(item) {
  const recipe = data.recipes.find((r) => r.id === item.recipeId);
  return `<label class="wide">${tr("使用的配方")}<select name="recipeId"><option value="">${tr("不使用配方")}</option>${data.recipes.map((r) => `<option data-user value="${esc(r.id)}" ${r.id === item.recipeId ? "selected" : ""}>${esc(r.name)}</option>`).join("")}${item.recipeId && !recipe ? `<option data-user value="${esc(item.recipeId)}" selected>${esc(item.recipeName || tr("历史配方"))}</option>` : ""}</select><input type="hidden" name="recipeName" value="${esc(item.recipeName || recipe?.name || "")}"><small class="meta">${tr("选择配方会填入目标参数，你可以调整为本次实际值。")}</small></label>`;
}
function setupWorkbenchFields(type, item) {
  $("#delete").textContent = tr(
    type === "device"
      ? item.archived
        ? "重新启用"
        : "停用设备"
      : type === "recipe"
        ? "删除配方"
        : "删除",
  );
  if (type === "device") {
    $("#fields").innerHTML =
      field(
        "设备名称 *",
        "name",
        item.name,
        "text",
        'required maxlength="100"',
      ) +
      select(
        "设备类型",
        "type",
        ["machine", "grinder"],
        item.type || "machine",
      ) +
      field("品牌 / 型号", "model", item.model) +
      `<label class="wide">${tr("设备备注")}<textarea name="notes" rows="3">${esc(item.notes || "")}</textarea></label><p class="meta wide">${tr("停用后不会出现在新记录的设备列表，历史记录仍会保留。")}</p>`;
    const opts = $("[name=type]").options;
    opts[0].textContent = tr("咖啡机");
    opts[1].textContent = tr("磨豆机");
    if (editing) $("[name=type]").disabled = true;
    return;
  }
  const isRecipe = type === "recipe";
  $("#fields").innerHTML =
    (isRecipe
      ? field(
          "配方名称 *",
          "name",
          item.name,
          "text",
          'required maxlength="100"',
        )
      : recipeSelect(item)) +
    beanSelect(item, !isRecipe) +
    (isRecipe
      ? ""
      : field("记录日期", "date", item.date || date(), "date", "required") +
        field(
          "本次时间",
          "timeOfDay",
          item.timeOfDay ??
            (editing ? "" : new Date().toTimeString().slice(0, 5)),
          "time",
        )) +
    `<p class="form-section wide">${tr(isRecipe ? "目标参数" : "实际参数")}</p><div class="equipment-fields wide">${equipmentSelect("machine", item) + equipmentSelect("grinder", item)}</div>` +
    parameterFields(item) +
    (isRecipe
      ? ""
      : select(
          "我的评分",
          "rating",
          ["未评分", "1", "2", "3", "4", "5"],
          String(item.rating || "未评分"),
        )) +
    `<label class="wide">${tr(isRecipe ? "配方步骤 / 要点" : "品饮感受 / 下次调整")}<textarea name="notes" rows="3" maxlength="2000">${esc(item.notes || "")}</textarea></label>`;
  wireEquipmentFields();
  if (!isRecipe)
    showRecipeInstructions(data.recipes.find((r) => r.id === item.recipeId));
  if (!isRecipe)
    $("[name=recipeId]").onchange = (e) => {
      const selected = data.recipes.find((r) => r.id === e.target.value),
        r = selected ? freshEquipment(selected) : null;
      $("[name=recipeName]").value = r?.name || "";
      showRecipeInstructions(r);
      if (!r) return;
      for (const k of [
        "method",
        "grind",
        "dose",
        "yield",
        "time",
        "temperature",
      ])
        if ($("[name=" + k + "]")) $("[name=" + k + "]").value = r[k] || "";
      if (data.beans.some((b) => b.id === r.beanId))
        $("[name=beanId]").value = r.beanId;
      $(".equipment-fields").innerHTML =
        equipmentSelect("machine", r) + equipmentSelect("grinder", r);
      wireEquipmentFields();
      localize();
    };
}
function wireEquipmentFields() {
  for (const key of ["machine", "grinder"])
    $("[name=" + key + "Id]").onchange = (e) => {
      $("[name=" + key + "]").value =
        data.devices.find((d) => d.id === e.target.value)?.name || "";
    };
}
function openWorkbenchForm(type, item = {}, reuse = false) {
  captureFormBaseline(type, reuse ? null : item.id);
  kind = type;
  editing = reuse ? null : item.id || null;
  photoBusy = false;
  photoGeneration++;
  if (type === "brew" && !editing && !data.beans.length) {
    toast("请先添加豆卡");
    openForm("bean");
    return;
  }
  if (reuse)
    item = {
      ...item,
      date: date(),
      timeOfDay: new Date().toTimeString().slice(0, 5),
      rating: "",
      notes: "",
    };
  $("#modalTitle").textContent = tr(
    type === "device"
      ? editing
        ? "编辑设备"
        : "添加设备"
      : type === "recipe"
        ? editing
          ? "编辑配方"
          : "新建配方"
        : editing
          ? "编辑冲煮记录"
          : "记录今天这一杯",
  );
  $("#delete").hidden = !editing;
  if ((type === "brew" || type === "recipe") && !editing)
    item = freshEquipment(item);
  setupWorkbenchFields(type, item);
  localize();
  $("#modal").showModal();
}
async function saveWorkbench(obj) {
  const list =
    kind === "device" ? "devices" : kind === "recipe" ? "recipes" : "brews";
  if ((kind === "device" || kind === "recipe") && !obj.name) {
    toast(kind === "device" ? "设备名称不能为空" : "配方名称不能为空");
    return;
  }
  if (kind === "device") {
    const old = data.devices.find((d) => d.id === editing);
    obj.type = old?.type || obj.type;
    obj.archived = old?.archived || false;
  } else {
    if (
      ![obj.dose, obj.yield, obj.time].every(
        (v) => Number.isFinite(Number(v)) && Number(v) > 0,
      )
    ) {
      return;
    }
    if (kind === "brew") {
      const bean = data.beans.find((b) => b.id === obj.beanId),
        old = data.brews.find((b) => b.id === editing);
      if (!bean && old?.beanId !== obj.beanId) return;
      obj.beanName = bean?.name || old?.beanName || "Coffee";
      if (obj.rating === "未评分") obj.rating = "";
      obj.favorite = false;
    }
    for (const key of ["machine", "grinder"])
      if (obj[key + "Id"] === "legacy") obj[key + "Id"] = "";
  }
  obj.id = editing || journalId();
  const next = structuredClone(data);
  if (editing) next[list] = next[list].map((x) => (x.id === editing ? obj : x));
  else next[list].push(obj);
  if (await persist(next)) {
    $("#modal").close();
    toast(
      kind === "device"
        ? "已保存设备"
        : kind === "recipe"
          ? "已保存配方"
          : "已保存本次冲煮",
    );
  }
}
async function deleteWorkbench() {
  const next = structuredClone(data);
  if (kind === "device") {
    const d = next.devices.find((d) => d.id === editing);
    d.archived = !d.archived;
  } else {
    if (!confirm(tr("删除配方？已有冲煮记录和实际参数会保留。"))) return;
    next.recipes = next.recipes.filter((r) => r.id !== editing);
  }
  if (await persist(next)) $("#modal").close();
}
function renderEquipment() {
  const q = $("#search").value.toLowerCase();
  $("#sectionTitle").innerHTML =
    tr("我的设备") +
    " <small>" +
    tr("添加你的咖啡机和磨豆机，记录时直接选择。") +
    "</small>";
  $("#sectionEyebrow").textContent = "MY COFFEE SETUP";
  $("#addBean").textContent = tr("添加设备");
  $("#content").innerHTML =
    data.devices
      .filter((d) =>
        [d.name, d.model, tr(d.type === "machine" ? "咖啡机" : "磨豆机")].some(
          (v) =>
            String(v || "")
              .toLowerCase()
              .includes(q),
        ),
      )
      .map(
        (d) =>
          `<article class="equipment-card"><div class="recipe-kicker">${tr(d.type === "machine" ? "咖啡机" : "磨豆机")} · ${tr(d.archived ? "已停用" : "在用")}</div><h3 data-user>${esc(d.name)}</h3><p data-user>${esc(d.model || "")}</p><p class="meta" data-user>${esc(d.notes || "")}</p><button class="outline" data-device="${esc(d.id)}">${tr("编辑设备")}</button></article>`,
      )
      .join("") ||
    `<div class="empty"><h3>${tr(q ? "没有找到匹配记录" : "暂无设备")}</h3><p>${tr("添加你的咖啡机和磨豆机，记录时直接选择。")}</p><button class="primary" data-new-device>${tr("添加设备")}</button></div>`;
}
function renderRecipes() {
  const q = $("#search").value.toLowerCase();
  $("#sectionTitle").innerHTML =
    tr("心选配方") +
    " <small>" +
    tr("长期保存的参数，随时冲出下一杯") +
    "</small>";
  $("#sectionEyebrow").textContent = "THE RECIPE COLLECTION";
  $("#addBean").textContent = tr("新建配方");
  $("#content").innerHTML =
    `<p class="view-note">${tr("配方是可反复使用的方案；每次冲煮单独记录实际结果。")}</p>` +
    (data.recipes
      .filter((r) =>
        [r.name, r.notes, tr(r.method)].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(q),
        ),
      )
      .map((r) => {
        const uses = data.brews.filter((b) => b.recipeId === r.id).length;
        return `<article class="recipe-card"><p class="recipe-kicker">RECIPE · ${esc(tr(r.method || ""))}</p><h3 data-user>${esc(r.name)}</h3><p class="meta" data-user>${esc(localizedBean(data.beans.find((b) => b.id === r.beanId))?.name || tr("不限豆子"))}</p><div class="recipe-parameters"><span><b>${esc(r.dose)}</b> g <small>${tr("粉重 g")}</small></span><span><b>${esc(r.yield)}</b> g <small>${tr(r.method === "意式浓缩" ? "液重" : "注水量")}</small></span><span><b>${esc(r.time)}</b> s <small>${tr("萃取秒数")}</small></span></div><p class="recipe-steps" data-user>${esc(r.notes || "")}</p><p class="meta">${tr("使用次数")} · ${uses}</p><div class="recipe-actions"><button class="primary" data-brew-recipe="${esc(r.id)}">${tr("使用配方冲一杯")}</button><button class="outline" data-recipe="${esc(r.id)}">${tr("编辑")}</button></div></article>`;
      })
      .join("") ||
      `<div class="empty"><h3>${tr(q ? "没有找到匹配记录" : "还没有配方")}</h3><p>${tr("创建一份长期使用的配方，也可从任意冲煮记录保存。")}</p><button class="primary" data-new-recipe>${tr("新建配方")}</button></div>`);
}
function renderBrewHistory() {
  const q = $("#search").value.toLowerCase();
  $("#sectionTitle").innerHTML =
    tr("冲煮手记") + " <small>" + tr("每一次冲煮，都是独立的记录") + "</small>";
  const brews = [...data.brews]
    .reverse()
    .filter((b) =>
      [
        localizedBean(data.beans.find((x) => x.id === b.beanId))?.name ||
          b.beanName,
        b.recipeName,
        b.machine,
        b.grinder,
        b.notes,
        tr(b.method),
      ].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      ),
    )
    .sort((a, b) =>
      (b.date + " " + (b.timeOfDay || "")).localeCompare(
        a.date + " " + (a.timeOfDay || ""),
      ),
    );
  $("#content").innerHTML =
    brews
      .map(
        (b) =>
          `<article class="brew brew-event"><div class="event-date"><strong>${esc(b.date)}</strong><span>${esc(b.timeOfDay || "—")}</span></div><div class="event-detail"><h3 data-user>${esc(localizedBean(data.beans.find((x) => x.id === b.beanId))?.name || b.beanName || tr("已删除豆卡"))}</h3><p>${esc(tr(b.method))} · <span data-user>${esc(b.machine || "—")} / ${esc(b.grinder || "—")}</span></p><p><span>${tr("使用的配方")}</span> · <span data-user>${esc(b.recipeName || tr("自由冲煮"))}</span></p><p data-user>${esc(b.notes || "")}${b.rating ? " · " + esc(b.rating) + " / 5" : ""}</p><div class="event-parameters"><span>${tr("粉重 g")} <b>${esc(b.dose)}</b></span><span>${tr(b.method === "意式浓缩" ? "液重" : "注水量")} <b>${esc(b.yield)} g</b></span><span>${tr("萃取秒数")} <b>${esc(b.time)}</b></span><span>${tr("研磨刻度")} <b data-user>${esc(b.grind || "—")}</b></span></div></div><div class="brew-actions"><button data-save-recipe="${esc(b.id)}">${tr("保存为配方")}</button><button data-editbrew="${esc(b.id)}">${tr("编辑")}</button></div></article>`,
      )
      .join("") ||
    `<div class="empty"><h3>${tr(q ? "没有找到匹配记录" : "今天的咖啡，是什么味道？")}</h3><button class="primary" data-new-brew>${tr("＋ 记录一杯")}</button></div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if ("newDevice" in d) openWorkbenchForm("device");
  if ("newRecipe" in d) openWorkbenchForm("recipe");
  if ("newBrew" in d) openWorkbenchForm("brew");
  if (d.device)
    openWorkbenchForm(
      "device",
      data.devices.find((x) => x.id === d.device),
    );
  if (d.recipe)
    openWorkbenchForm(
      "recipe",
      data.recipes.find((x) => x.id === d.recipe),
    );
  if (d.brewRecipe) {
    const r = data.recipes.find((x) => x.id === d.brewRecipe);
    openWorkbenchForm("brew", {
      ...r,
      id: null,
      recipeId: r.id,
      recipeName: r.name,
      notes: "",
      rating: "",
      date: date(),
    });
  }
  if (d.saveRecipe) {
    const brew = data.brews.find((x) => x.id === d.saveRecipe),
      bean = localizedBean(data.beans.find((x) => x.id === brew.beanId));
    openWorkbenchForm("recipe", {
      ...brew,
      id: null,
      name: (bean?.name || "Coffee") + " · " + tr(brew.method),
      notes: brew.notes || "",
    });
  }
});
function freshEquipment(item) {
  const next = { ...item };
  for (const key of ["machine", "grinder"]) {
    const id = next[key + "Id"];
    if (!id) continue;
    const current = data.devices.find(
      (d) => d.id === id && d.type === key && !d.archived,
    );
    next[key + "Id"] = current?.id || "";
    next[key] = current?.name || "";
  }
  return next;
}
function showRecipeInstructions(recipe) {
  let block = $("#recipeInstructions");
  if (!block) {
    block = document.createElement("div");
    block.id = "recipeInstructions";
    block.className = "wide meta";
    block.setAttribute("data-user", "");
    $("[name=recipeId]").parentElement.after(block);
  }
  block.hidden = !recipe?.notes;
  block.style.whiteSpace = "pre-wrap";
  block.textContent = recipe?.notes
    ? tr("配方操作步骤") + "\n" + recipe.notes
    : "";
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
    if (!d.name?.trim() || !["machine", "grinder"].includes(d.type))
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

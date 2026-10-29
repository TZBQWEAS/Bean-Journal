const $ = (s) => document.querySelector(s),
  key = "doujian-v1";
let data = { beans: [], brews: [], devices: [], recipes: [], schemaVersion: 2 },
  view = "home",
  filter = "全部",
  editing = null,
  kind = "bean";
function toast(t) {
  $("#toast").textContent = tr(t);
  $("#toast").style.display = "block";
  setTimeout(() => ($("#toast").style.display = "none"), 2800);
}
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved && Array.isArray(saved.beans) && Array.isArray(saved.brews))
    data = normalizeJournal(saved);
} catch {
  setTimeout(() => toast("无法读取已有记录，请检查浏览器存储或导入备份"), 100);
}
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const date = () => new Date().toLocaleDateString("sv-SE");
let formBaseline = null;
function captureFormBaseline(type, id) {
  const list =
    type === "bean"
      ? "beans"
      : type === "brew"
        ? "brews"
        : type === "recipe"
          ? "recipes"
          : "devices";
  formBaseline = id
    ? { list, id, record: structuredClone(data[list].find((x) => x.id === id)) }
    : null;
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
  merged.schemaVersion = 2;
  return merged;
}
function persist(next, { replace = false } = {}) {
  const initialRaw = localStorage.getItem(key),
    base = structuredClone(data),
    wanted = structuredClone(next),
    baseline = formBaseline && structuredClone(formBaseline);
  if (!navigator.locks?.request) {
    toast("当前浏览器不支持安全保存，请使用新版浏览器");
    return Promise.resolve(false);
  }
  return navigator.locks.request("doujian-journal-write", () => {
    try {
      const raw = localStorage.getItem(key);
      const current =
        raw && !replace
          ? validateJournalBackup(JSON.parse(raw))
          : {
              beans: [],
              brews: [],
              devices: [],
              recipes: [],
              schemaVersion: 2,
            };
      let merged;
      if (replace) {
        if (raw !== initialRaw) throw Error("conflict");
        merged = { ...wanted, generation: crypto.randomUUID() };
      } else merged = mergeJournal(base, wanted, current, baseline);
      merged = validateJournalBackup(merged);
      localStorage.setItem(key, JSON.stringify(merged));
      data = merged;
      render();
      return true;
    } catch (error) {
      toast(
        error.message === "conflict"
          ? "记录已在另一页面更新，请重新打开后再保存"
          : "保存失败：浏览器存储不可用或已满，请先导出备份",
      );
      return false;
    }
  });
}
function refreshStoredJournal() {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const latest = validateJournalBackup(JSON.parse(raw));
    if (!sameRecord(data, latest)) {
      data = latest;
      render();
    }
  } catch {}
}
window.addEventListener("storage", (e) => {
  if (e.key === key) refreshStoredJournal();
});
window.addEventListener("focus", refreshStoredJournal);

function render() {
  const q = $("#search").value.trim().toLowerCase();
  $("#beanCount").textContent = data.beans.length;
  $("#brewCount").textContent = data.brews.length;
  $("#sBeans").innerHTML = data.beans.length + " <small>款</small>";
  $("#sBrews").innerHTML = data.brews.length + " <small>杯</small>";
  $("#sFav").innerHTML = data.recipes.length + " <small>份</small>";
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $("#homeView").hidden = view !== "home";
  $(".collection").hidden = view === "home";
  if (view === "home") {
    renderDashboard();
    localize();
    return;
  }
  $("#sectionTitle").innerHTML =
    view === "beans"
      ? "我的豆卡 <small>收藏你的风味地图</small>"
      : view === "favorites"
        ? "心选配方 <small>下一杯，复刻喜欢的味道</small>"
        : "冲煮手记 <small>每一次尝试，都有迹可循</small>";
  $("#sectionEyebrow").textContent =
    view === "beans" ? "THE BEAN COLLECTION" : "YOUR BREWING JOURNEY";
  $("#filters").style.display = view === "beans" ? "block" : "none";
  $("#addBean").textContent = view === "beans" ? "＋ 添加豆卡" : "＋ 记录一杯";
  $("#addBean").hidden = view === "map";
  $(".toolbar").hidden = view === "map";
  $("#search").placeholder = tr(
    {
      beans: "搜索豆名、产地、风味…",
      brews: "搜索冲煮记录…",
      favorites: "搜索配方…",
      devices: "搜索设备…",
    }[view] || "搜索记录",
  );
  if (view === "map") {
    renderOriginMap();
    localize();
    return;
  }
  if (view === "devices") {
    renderEquipment();
    localize();
    return;
  }
  if (view === "favorites") {
    renderRecipes();
    localize();
    return;
  }
  if (view === "brews") {
    renderBrewHistory();
    localize();
    return;
  }
  let html = "";
  if (view === "beans") {
    const beans = data.beans.map(localizedBean).filter(
      (b) =>
        (filter === "全部" || b.roast === filter) &&
        [
          b.name,
          b.origin,
          b.flavors,
          b.roaster,
          tr(b.beanType || "未分类"),
        ].some((t) =>
          String(t || "")
            .toLowerCase()
            .includes(q),
        ),
    );
    html = beans
      .map(
        (b, i) =>
          `<article class="bean"><div class="card-art" data-roast="${b.roast === "深烘" ? "dark" : b.roast === "中烘" ? "medium" : "light"}"><span class="origin">BEAN CARD / ${String(i + 1).padStart(2, "0")}</span><span class="roast-beans" aria-hidden="true"><i></i><i></i><i></i></span><span class="roast"><span data-user>${esc(b.origin || tr("产地待记录"))}</span> · ${esc(tr(b.roast))}</span></div><div class="card-body"><h3><span data-user>${esc(b.name)}</span></h3><div class="meta"><span data-user>${esc(b.roaster || tr("我的咖啡豆"))}</span> · <span data-user>${esc(b.process || tr("处理法待记录"))}</span></div><div class="bean-kind">${esc(tr(b.beanType || "未分类"))}</div><div class="tags">${(
            b.flavors || tr("风味待探索")
          )
            .split(/[,，、]/)
            .filter(Boolean)
            .map(
              (f) =>
                `<span class="tag"><span data-user>${esc(f)}</span></span>`,
            )
            .join(
              "",
            )}</div><div class="meta"><span>烘焙日期</span> ${esc(b.roastDate || tr("未填写"))} · ${esc(b.weight || "—")} g</div><div class="card-bottom"><button data-editbean="${esc(b.id)}">查看豆卡 ↗</button><button data-brewbean="${esc(b.id)}">冲一杯 ＋</button></div></div></article>`,
      )
      .join("");
  } else {
    html = data.brews
      .filter(
        (b) =>
          (view !== "favorites" || b.favorite) &&
          [
            localizedBean(data.beans.find((x) => x.id === b.beanId))?.name,
            tr(b.method),
            b.notes,
            b.grinder,
          ].some((t) =>
            String(t || "")
              .toLowerCase()
              .includes(q),
          ),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(
        (b) =>
          `<article class="brew"><div><h3><span data-user>${esc(localizedBean(data.beans.find((x) => x.id === b.beanId))?.name || tr("已删除豆卡"))}</span></h3><p>${esc(b.date)} · ${esc(tr(b.method))} · <span data-user>${esc(b.grinder || tr("未填磨豆机"))}</span></p><p><span data-user>${esc(b.notes || "")}</span> ${b.rating ? " · " + esc(b.rating) + " / 5" : ""}</p></div><div class="metrics"><div><b>${esc(b.grind || "—")}</b><small>研磨刻度</small></div><div><b>${esc(b.dose)}</b><small>粉重 g</small></div><div><b>${esc(b.yield)}</b><small>${esc(tr(b.method === "意式浓缩" ? "液重" : "注水量"))} g</small></div><div><b>${esc(b.time)}</b><small>萃取秒数</small></div><div><b>1:${(b.yield / b.dose).toFixed(1)}</b><small>粉液 / 粉水比</small></div></div><div class="brew-actions"><button class="fav" data-fav="${esc(b.id)}" aria-label="${b.favorite ? "取消收藏" : "收藏配方"}">${b.favorite ? "♥" : "♡"}</button><button data-reuse="${esc(b.id)}">复用</button><button data-editbrew="${esc(b.id)}">编辑</button></div></article>`,
      )
      .join("");
  }
  $("#content").innerHTML =
    html ||
    `<div class="empty"><div style="font-size:30px">${view === "beans" ? "◒" : "☕"}</div><h3>${q || filter !== "全部" ? "没有找到匹配记录" : view === "favorites" ? "把值得再喝的那一杯，留在这里" : view === "beans" ? "你的风味收藏，从第一颗豆子开始" : "今天的咖啡，是什么味道？"}</h3><p>${view === "beans" ? "添加豆卡，记下产地、烘焙与风味。" : "在冲煮手记中记录参数，点击爱心收藏喜欢的配方。"}</p>${view === "beans" ? '<button class="primary" data-emptyadd>＋ 添加第一张豆卡</button>' : ""}${!data.beans.length ? '<button class="outline" id="demo">看看示例豆卡</button>' : ""}</div>`;
  localize();
}
function field(label, name, value = "", type = "text", extra = "") {
  return `<label>${label}<input name="${name}" type="${type}" ${type === "date" ? 'data-date-input="true"' : ""} value="${esc(value)}" ${extra}></label>`;
}
function select(label, name, values, value) {
  return `<label>${label}<select name="${name}">${values.map((v) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>`;
}
function openForm(type, item = {}, reuse = false) {
  captureFormBaseline(type, reuse ? null : item.id);
  if (type !== "bean") {
    openWorkbenchForm(type, item, reuse);
    return;
  }
  $("#delete").textContent = tr("删除");
  if (type === "bean") item = localizedBean(item);
  kind = type;
  editing = reuse ? null : item.id || null;
  photoBusy = false;
  photoGeneration++;
  if (type === "brew" && !data.beans.length) {
    toast("先添加一张豆卡，再记录这杯咖啡");
    openForm("bean");
    return;
  }
  $("#modalTitle").textContent =
    type === "bean"
      ? editing
        ? "豆卡详情"
        : "添加一张豆卡"
      : reuse
        ? "复用配方 · 新的一杯"
        : editing
          ? "编辑冲煮记录"
          : "记录今天这一杯";
  $("#delete").hidden = !editing;
  $("#fields").innerHTML =
    type === "bean"
      ? field(
          "豆子名称 *",
          "name",
          item.name,
          "text",
          'required maxlength="100"',
        ) +
        field("烘焙商", "roaster", item.roaster) +
        field("产地 / 庄园", "origin", item.origin) +
        select("烘焙程度", "roast", ["浅烘", "中烘", "深烘"], item.roast) +
        select(
          "咖啡豆种类",
          "beanType",
          ["未分类", "单品", "拼配"],
          item.beanType || "未分类",
        ) +
        field("处理法", "process", item.process) +
        field("烘焙日期", "roastDate", item.roastDate, "date") +
        field(
          "购入重量（g）",
          "weight",
          item.weight,
          "number",
          'min="0.1" step="0.1"',
        ) +
        field("风味标签（用逗号分隔）", "flavors", item.flavors)
      : `<label class="wide">选择豆卡 *<select name="beanId" required>${data.beans
          .map(localizedBean)
          .map(
            (b) =>
              `<option data-user value="${esc(b.id)}" ${b.id === item.beanId ? "selected" : ""}>${esc(b.name)}</option>`,
          )
          .join("")}</select></label>` +
        select(
          "冲煮方式",
          "method",
          ["手冲", "意式浓缩", "爱乐压", "法压壶", "摩卡壶", "冷萃", "其他"],
          item.method,
        ) +
        field(
          "记录日期",
          "date",
          reuse ? date() : item.date || date(),
          "date",
          "required",
        ) +
        field("磨豆机", "grinder", item.grinder) +
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
          item.dose ?? 15,
          "number",
          'required min="0.1" max="5000" step="0.1"',
        ) +
        field(
          "液重 / 注水量（g） *",
          "yield",
          item.yield ?? 225,
          "number",
          'required min="0.1" max="50000" step="0.1"',
        ) +
        field(
          "萃取时间（秒） *",
          "time",
          item.time ?? 150,
          "number",
          'required min="1" max="604800" step="1"',
        ) +
        field(
          "水温（°C）",
          "temperature",
          item.temperature ?? 92,
          "number",
          'min="0" max="100" step="0.1"',
        ) +
        select(
          "我的评分",
          "rating",
          ["未评分", "1", "2", "3", "4", "5"],
          String(item.rating || "未评分"),
        ) +
        `<div class="meta" style="align-self:center">意式填写杯中液重；<br>手冲等方式填写总注水量。</div>`;
  $("#fields").innerHTML +=
    `<label class="wide">${type === "bean" ? "豆卡备注" : "品饮感受 / 下次调整"}<textarea name="notes" rows="3" maxlength="2000" placeholder="记下属于你的风味记忆…">${esc(item.notes || "")}</textarea></label>`;
  if (type === "bean") {
    attachPhotoEditor(item);
    addOriginSuggestions();
  }
  localize();
  $("#modal").showModal();
}
$("#form").onsubmit = async (e) => {
  e.preventDefault();
  if (!validateDateInputs()) return;
  if (photoBusy) {
    toast("照片处理中，请稍候");
    return;
  }
  const obj = Object.fromEntries(new FormData(e.target));
  for (const k in obj) obj[k] = obj[k].trim();
  if (kind !== "bean") {
    await saveWorkbench(obj);
    return;
  }
  if (kind === "bean" && !obj.name) {
    toast("请填写豆子名称");
    return;
  }
  if (kind === "bean") {
    delete obj.originCountry;
    delete obj.originDetail;
    obj.photo = draftPhoto;
    preserveSampleFields(
      obj,
      data.beans.find((b) => b.id === editing),
    );
  }
  obj.id = editing || crypto.randomUUID();
  const list = kind === "bean" ? "beans" : "brews";
  if (kind === "brew") {
    obj.favorite = editing
      ? !!data.brews.find((b) => b.id === editing)?.favorite
      : false;
    if (obj.rating === "未评分") obj.rating = "";
  }
  const next = structuredClone(data);
  if (editing) next[list] = next[list].map((x) => (x.id === editing ? obj : x));
  else next[list].push(obj);
  if (await persist(next)) {
    $("#modal").close();
    toast("已保存，下一杯也有迹可循");
  }
};
$("#delete").onclick = async () => {
  if (kind === "device" || kind === "recipe") {
    await deleteWorkbench();
    return;
  }
  if (
    !confirm(
      tr(
        kind === "bean"
          ? "删除这张豆卡？已有关联冲煮记录会保留。"
          : "删除这条冲煮记录？",
      ),
    )
  )
    return;
  const next = structuredClone(data);
  if (kind === "bean") {
    next.beans = next.beans.filter((x) => x.id !== editing);
    next.brews = next.brews.map((x) =>
      x.beanId === editing
        ? {
            ...x,
            beanName:
              x.beanName ||
              data.beans.find((b) => b.id === editing)?.name ||
              "Coffee",
          }
        : x,
    );
  } else next.brews = next.brews.filter((x) => x.id !== editing);
  if (await persist(next)) $("#modal").close();
};
$("#close").onclick = () => $("#modal").close();
$("#newBrew").onclick = () => openForm("brew");
$("#addBean").onclick = () =>
  openForm(
    view === "beans"
      ? "bean"
      : view === "devices"
        ? "device"
        : view === "favorites"
          ? "recipe"
          : "brew",
  );
$("#search").oninput = render;
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (d.view) {
    view = d.view;
    filter = "全部";
    $("#search").value = "";
    document
      .querySelectorAll("[data-filter]")
      .forEach((x) =>
        x.classList.toggle("selected", x.dataset.filter === "全部"),
      );
    render();
  }
  if (d.filter) {
    filter = d.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((x) => x.classList.toggle("selected", x === b));
    render();
  }
  if (d.editbean)
    openForm(
      "bean",
      data.beans.find((x) => x.id === d.editbean),
    );
  if (d.brewbean) openForm("brew", { beanId: d.brewbean });
  if (d.editbrew)
    openForm(
      "brew",
      data.brews.find((x) => x.id === d.editbrew),
    );
  if (d.reuse)
    openForm(
      "brew",
      data.brews.find((x) => x.id === d.reuse),
      true,
    );
  if (d.fav) {
    const next = structuredClone(data);
    const x = next.brews.find((x) => x.id === d.fav);
    x.favorite = !x.favorite;
    persist(next);
  }
  if ("emptyadd" in d) openForm("bean");
  if (b.id === "demo") {
    persist({
      ...data,
      beans: [
        {
          id: crypto.randomUUID(),
          sampleKey: "yirgacheffe",
          beanType: "单品",
          name: "示例 · 耶加雪菲",
          origin: "埃塞俄比亚",
          roaster: "示例烘焙商",
          roast: "浅烘",
          process: "水洗",
          flavors: "茉莉,柑橘,蜂蜜",
          weight: "200",
          notes: "这是一张演示豆卡，可以编辑或删除。",
        },
        {
          id: crypto.randomUUID(),
          sampleKey: "colombia",
          beanType: "单品",
          name: "示例 · 哥伦比亚",
          origin: "哥伦比亚",
          roast: "中烘",
          process: "日晒",
          flavors: "莓果,焦糖,可可",
          weight: "250",
          notes: "演示数据",
        },
      ],
      brews: [],
    });
  }
});
$("#export").onclick = () => {
  refreshStoredJournal();
  const blob = new Blob([JSON.stringify({ version: 2, ...data }, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "豆间备份-" + date() + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("备份已导出");
};
$("#import").onclick = () => $("#importFile").click();
$("#importFile").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 25000000) throw Error();
    const obj = JSON.parse(await file.text());
    const imported = validateJournalBackup(obj);
    if (
      confirm(
        tr(
          "导入会替换当前全部豆卡、设备、配方和冲煮记录。建议先导出备份。继续？",
        ),
      )
    ) {
      if (await persist(imported, { replace: true })) toast("备份已恢复");
    }
  } catch {
    toast("备份格式无效，请选择豆间导出的 JSON 文件");
  }
  e.target.value = "";
};
render();

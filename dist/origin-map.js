Object.assign(dictionary, {
  "◎　来源地图": "◎  Origin map",
  来源地图: "Origin map",
  "从产地，认识每一颗豆子": "Discover the origins of your beans",
  数据备份: "Data backup",
  "导出包含豆卡、照片和冲煮记录；导入会替换当前记录。":
    "Exports include beans, photos and brews. Import replaces current records.",
  "按国家 / 地区展示近似位置，不代表庄园的精确坐标。":
    "Markers show approximate country / region locations, not exact farm coordinates.",
  "悬浮、聚焦或点击标记查看豆卡信息。":
    "Hover, focus or tap a marker to explore your beans.",
  未识别的产地: "Unrecognized origins",
  "请在豆卡的产地中补充国家 / 地区名称。":
    "Add a country / region name to the origin field in bean details.",
  暂无产地记录: "No origins yet",
  "添加豆卡并填写产地，点亮你的咖啡地图。":
    "Add beans with an origin to start your coffee map.",
  已标记的产地: "Mapped origins",
  查看详情: "View details",
  产地未填写: "Origin not entered",
  "例：埃塞俄比亚 / 耶加雪菲": "e.g. Ethiopia / Yirgacheffe",
  "产地可写国家 / 地区，再补充产区或庄园。":
    "Enter a country / region, followed by the growing region or farm.",
  "地图数据：Natural Earth": "Map data: Natural Earth",
});
for (const [zh, en] of Object.entries(dictionary)) reverseDictionary[en] = zh;
const regionalAliases = {
  ETH: [
    "耶加雪菲",
    "耶加雪啡",
    "西达摩",
    "西达马",
    "古吉",
    "yirgacheffe",
    "sidamo",
    "sidama",
    "guji",
  ],
  CHN: ["云南", "雲南", "普洱", "保山", "yunnan", "puer"],
  IDN: [
    "苏门答腊",
    "蘇門答臘",
    "曼特宁",
    "曼特寧",
    "sumatra",
    "mandheling",
    "爪哇",
    "java",
    "印尼",
  ],
  JAM: ["牙买加", "牙買加", "jamaica"],
  CRI: ["哥斯达黎加", "哥斯大黎加", "costa rica"],
  GTM: ["危地马拉", "瓜地馬拉", "guatemala"],
  USA: ["夏威夷", "科纳", "科納", "hawaii", "kona"],
  VNM: ["越南", "vietnam"],
  TLS: ["东帝汶", "東帝汶", "timor-leste"],
};
function originMatches(origin) {
  const value = String(origin || "")
    .normalize("NFKC")
    .toLowerCase();
  if (!value.trim()) return [];
  const matches = [];
  for (const country of originCountries) {
    for (const alias of [
      ...country.aliases,
      ...(regionalAliases[country.id] || []),
    ]) {
      const name = alias.normalize("NFKC").toLowerCase();
      let start = value.indexOf(name);
      while (start !== -1) {
        const end = start + name.length;
        const chinese = /[\u3400-\u9fff]/.test(name);
        if (
          chinese ||
          (!/[a-z]/.test(value[start - 1] || "") &&
            !/[a-z]/.test(value[end] || ""))
        )
          matches.push({
            country,
            start,
            end,
            explicit: country.aliases.includes(alias),
          });
        start = value.indexOf(name, start + 1);
      }
    }
  }
  const preferred = matches.some((m) => m.explicit)
    ? matches.filter((m) => m.explicit)
    : matches;
  const longest = preferred.filter(
    (m) =>
      !preferred.some(
        (other) =>
          other.start <= m.start &&
          other.end >= m.end &&
          other.end - other.start > m.end - m.start,
      ),
  );
  return [...new Map(longest.map((m) => [m.country.id, m.country])).values()];
}

function originGroups() {
  const groups = new Map(),
    unknown = [];
  for (const raw of data.beans) {
    const bean = localizedBean(raw),
      matches = originMatches(raw.origin);
    if (!matches.length) unknown.push(bean);
    for (const country of matches) {
      if (!groups.has(country.id))
        groups.set(country.id, { country, beans: [] });
      groups.get(country.id).beans.push(bean);
    }
  }
  return {
    groups: [...groups.values()].sort((a, b) =>
      countryName(a.country).localeCompare(
        countryName(b.country),
        preferences.language === "en" ? "en" : "zh-CN",
      ),
    ),
    unknown,
  };
}
function countryName(country) {
  return preferences.language === "en" ? country.en : country.zh;
}
// Translate recognized country prefixes only; preserve region and farm text.
function localizedOrigin(origin) {
  const value = String(origin || "");
  const candidates = originCountries
    .flatMap((c) =>
      [...new Set([c.zh, c.en, ...c.aliases])].map((alias) => ({ c, alias })),
    )
    .sort((a, b) => b.alias.length - a.alias.length);
  const match = candidates.find(
    ({ alias }) =>
      value.toLowerCase().startsWith(alias.toLowerCase()) &&
      (value.length === alias.length ||
        /^\s*[/／,，·—-]/.test(value.slice(alias.length))),
  );
  return match ? countryName(match.c) + value.slice(match.alias.length) : value;
}
function mapBeanSummary(bean) {
  const roast =
    bean.roast === "深烘"
      ? "dark"
      : bean.roast === "中深烘"
        ? "medium-dark"
        : bean.roast === "中烘"
          ? "medium"
          : "light";
  return `<div class="map-bean map-bean-card"><div class="card-art" data-roast="${roast}"><span class="roast-beans" aria-hidden="true"><i></i><i></i><i></i></span><span class="roast">${esc(tr(bean.roast || ""))}</span></div><div class="map-bean-body"><strong data-user>${esc(bean.name)}</strong><p><span data-user>${esc(bean.origin || tr("产地未填写"))}</span> · ${esc(tr(bean.beanType || "未分类"))}</p>${bean.flavors ? `<p data-user>${esc(bean.flavors)}</p>` : ""}</div></div>`;
}

function renderOriginMap() {
  const { groups, unknown } = originGroups();
  $("#sectionTitle").innerHTML =
    tr("来源地图") + " <small>" + tr("从产地，认识每一颗豆子") + "</small>";
  $("#sectionEyebrow").textContent = "A WORLD OF COFFEE";
  const canvas = `<div class="origin-map" id="originMap"><svg viewBox="0 0 1080 435" aria-hidden="true" focusable="false"><defs><pattern id="mapGrid" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M90 0H0V90" fill="none"/></pattern></defs><rect width="1080" height="435" class="map-ocean"/><rect width="1080" height="435" fill="url(#mapGrid)"/>${originCountries.map((c) => `<path class="map-country ${groups.some((g) => g.country.id === c.id) ? "has-beans" : ""}" d="${c.path}"/>`).join("")}</svg>${groups.map((g, i) => `<button type="button" class="map-pin" data-map-pin="${i}" style="left:${(g.country.x / 1080) * 100}%;top:${Math.max(2, Math.min(98, (g.country.y / 435) * 100))}%" aria-label="${esc(countryName(g.country))} · ${g.beans.length}" aria-describedby="originTooltip"><span>${g.beans.length}</span></button>`).join("")}<div id="originTooltip" class="origin-tooltip" role="tooltip" hidden></div></div>`;
  $("#content").innerHTML =
    `<section class="origin-view"><p class="map-help">${tr("悬浮、聚焦或点击标记查看豆卡信息。")}</p>${canvas}<p class="meta">${tr("按国家 / 地区展示近似位置，不代表庄园的精确坐标。")}</p><a class="map-credit" href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">${tr("地图数据：Natural Earth")}</a>${!data.beans.length ? `<div class="empty"><h3>${tr("暂无产地记录")}</h3><p>${tr("添加豆卡并填写产地，点亮你的咖啡地图。")}</p><button class="primary" data-emptyadd>${tr("＋ 添加第一张豆卡")}</button></div>` : ""}<div class="origin-list">${groups.map((g) => `<section class="origin-group"><h3>${esc(countryName(g.country))} <small>${g.beans.length}</small></h3>${g.beans.map((b) => mapBeanSummary(b) + `<button class="outline" data-editbean="${esc(b.id)}">${tr("查看详情")}</button>`).join("")}</section>`).join("")}</div>${unknown.length ? `<section class="unmapped"><h3>${tr("未识别的产地")} (${unknown.length})</h3><p class="meta">${tr("请在豆卡的产地中补充国家 / 地区名称。")}</p>${unknown.map((b) => mapBeanSummary(b) + `<button class="outline" data-editbean="${esc(b.id)}">${tr("查看详情")}</button>`).join("")}</section>` : ""}</section>`;
  const container = $("#originMap"),
    tip = $("#originTooltip");
  let pinned = null;
  function show(pin) {
    const group = groups[Number(pin.dataset.mapPin)];
    tip.innerHTML =
      `<strong>${esc(countryName(group.country))} · ${group.beans.length}</strong>` +
      group.beans.slice(0, 2).map(mapBeanSummary).join("") +
      (group.beans.length > 2
        ? '<p class="meta">' +
          (preferences.language === "en"
            ? "More beans are listed below."
            : "其余豆卡可在下方列表查看。") +
          "</p>"
        : "");
    tip.hidden = false;
    const box = container.getBoundingClientRect(),
      point = pin.getBoundingClientRect(),
      width = Math.min(300, Math.max(160, box.width - 24));
    tip.style.width = width + "px";
    tip.style.left =
      Math.max(8, Math.min(box.width - width - 8, point.left - box.left + 18)) +
      "px";
    const height = tip.offsetHeight;
    tip.style.top =
      Math.max(8, Math.min(box.height - height - 8, point.top - box.top + 20)) +
      "px";
  }
  for (const pin of container.querySelectorAll("[data-map-pin]")) {
    pin.onmouseenter = () => show(pin);
    pin.onfocus = () => show(pin);
    pin.onmouseleave = () => {
      if (!pinned) tip.hidden = true;
      else show(pinned);
    };
    pin.onblur = () => {
      if (!pinned) tip.hidden = true;
    };
    pin.onclick = () => {
      pinned = pinned === pin ? null : pin;
      if (pinned) show(pin);
      else tip.hidden = true;
    };
  }
  container.onclick = (e) => {
    if (!e.target.closest(".map-pin")) {
      pinned = null;
      tip.hidden = true;
    }
  };
  container.onkeydown = (e) => {
    if (e.key === "Escape") {
      pinned = null;
      tip.hidden = true;
    }
  };
}
function addOriginSuggestions() {
  const input = $("[name=origin]"),
    original = input.value,
    matches = originMatches(original),
    country = matches.length === 1 ? matches[0] : null;
  let detail = original;
  if (country) {
    const aliases = [...country.aliases].sort((a, b) => b.length - a.length);
    const alias = aliases.find(
      (a) =>
        original.toLowerCase().startsWith(a.toLowerCase()) &&
        (original.length === a.length ||
          /^[\s/／,，·—-]/.test(original.slice(a.length))),
    );
    if (alias)
      detail = original.slice(alias.length).replace(/^[\s/／,，·—-]+/, "");
  }
  const label = input.parentElement;
  label.replaceChildren();
  const title = document.createElement("span");
  title.textContent = tr("国家 / 地区");
  label.append(title);
  const select = document.createElement("select");
  select.name = "originCountry";
  select.innerHTML =
    `<option value="">${tr("请选择产地")}</option>` +
    [...originCountries]
      .sort((a, b) =>
        countryName(a).localeCompare(
          countryName(b),
          preferences.language === "en" ? "en" : "zh-CN",
        ),
      )
      .map(
        (c) =>
          `<option data-user value="${esc(c.id)}">${esc(countryName(c))}</option>`,
      )
      .join("") +
    `<option value="custom">${tr("其他 / 多产地")}</option>`;
  select.value = country ? country.id : original ? "custom" : "";
  label.append(select);
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder =
    preferences.language === "en" ? "Search countries…" : "搜索国家 / 地区…";
  search.setAttribute("aria-label", search.placeholder);
  search.autocomplete = "off";
  label.insertBefore(search, select);
  select.hidden = true;
  search.value = select.value ? select.selectedOptions[0].textContent : "";
  const results = document.createElement("div");
  results.className = "country-results";
  results.hidden = true;
  results.setAttribute(
    "aria-label",
    preferences.language === "en" ? "Matching countries" : "匹配国家",
  );
  label.append(results);
  search.setAttribute("aria-expanded", "false");
  const hideResults = () => {
    results.hidden = true;
    search.setAttribute("aria-expanded", "false");
  };
  function showResults() {
    const query = search.value.trim().toLowerCase();
    results.replaceChildren();
    const options = allOptions.filter((option) => {
      const c = originCountries.find((country) => country.id === option.value);
      return (
        option.value &&
        (!query ||
          (c
            ? [c.zh, c.en, ...c.aliases].some((name) =>
                name.toLowerCase().includes(query),
              )
            : option.textContent.toLowerCase().includes(query)))
      );
    });
    for (const option of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option.textContent;
      button.dataset.country = option.value;
      button.onclick = () => {
        search.value = "";
        filterCountries();
        select.value = option.value;
        select.dispatchEvent(new Event("change"));
        search.value = option.textContent;
        hideResults();
        search.focus();
      };
      results.append(button);
    }
    if (!options.length)
      results.textContent =
        preferences.language === "en"
          ? "No matching countries"
          : "没有匹配的国家";
    results.hidden = false;
    search.setAttribute("aria-expanded", "true");
  }
  search.onfocus = () => {
    if (search.value === select.selectedOptions[0]?.textContent)
      search.select();
  };
  search.onclick = () => {
    search.value = "";
    filterCountries();
    showResults();
  };
  label.addEventListener("focusout", (event) => {
    if (!label.contains(event.relatedTarget)) {
      hideResults();
      search.value = select.value ? select.selectedOptions[0].textContent : "";
    }
  });
  const allOptions = [...select.options].map((option) =>
    option.cloneNode(true),
  );
  let selectedCountry = select.value;
  function filterCountries() {
    const query = search.value.trim().normalize("NFKC").toLowerCase();
    select.replaceChildren(
      ...allOptions
        .filter((option) => {
          const c = originCountries.find(
            (country) => country.id === option.value,
          );
          return (
            !c ||
            option.value === selectedCountry ||
            [c.zh, c.en, ...c.aliases].some((name) =>
              name.normalize("NFKC").toLowerCase().includes(query),
            )
          );
        })
        .map((option) => option.cloneNode(true)),
    );
    select.value = selectedCountry;
  }
  search.oninput = () => {
    filterCountries();
    showResults();
  };
  search.onkeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      hideResults();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      results.querySelector("button")?.focus();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      results.querySelector("button")?.click();
    }
  };

  input.type = "hidden";
  input.removeAttribute("list");
  label.append(input);
  const detailLabel = document.createElement("label");
  detailLabel.innerHTML = `<span>${tr("产区 / 庄园（可选）")}</span><input name="originDetail" value="${esc(detail)}" placeholder="${tr("例如：耶加雪菲 / 某庄园")}" maxlength="200">`;
  label.after(detailLabel);
  const detailInput = detailLabel.querySelector("input");
  const sync = () => {
    const selected = originCountries.find((c) => c.id === select.value),
      region = detailInput.value.trim();
    input.value = selected
      ? [countryName(selected), region].filter(Boolean).join(" / ")
      : region;
  };
  select.onchange = () => {
    selectedCountry = select.value;
    sync();
  };
  detailInput.oninput = sync;
}

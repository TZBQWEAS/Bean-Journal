Object.assign(dictionary, {
  冲煮日历: "Brew calendar",
  本月小结: "Monthly summary",
  最近冲煮: "Recent brews",
  查看全部: "View all",
  上个月: "Previous month",
  下个月: "Next month",
  回到今天: "Today",
  冲煮天数: "Days brewed",
  咖啡用量: "Coffee used",
  最常用方式: "Favorite method",
  暂无记录: "No records yet",
  当天还没有冲煮记录: "No brews on this day",
  记录这一天: "Log this day",
  "点击日期查看当天的咖啡。": "Select a day to explore your brews.",
  有冲煮记录: "Brew recorded",
  "还没有冲煮记录，从今天的一杯开始。":
    "Your journal is waiting for its first brew.",
  日: "Sun",
  一: "Mon",
  二: "Tue",
  三: "Wed",
  四: "Thu",
  五: "Fri",
  六: "Sat",
  主界面: "Home",
});
for (const [zh, en] of Object.entries(dictionary)) reverseDictionary[en] = zh;
let calendarMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ),
  selectedBrewDate = new Date().toLocaleDateString("sv-SE");
function dashboardDate(d) {
  return d.toLocaleDateString("sv-SE");
}
function dashboardRecord(b) {
  const bean = localizedBean(data.beans.find((x) => x.id === b.beanId));
  return `<button class="recent-brew" data-editbrew="${esc(b.id)}"><span><strong data-user>${esc(bean?.name || b.beanName || tr("已删除豆卡"))}</strong><small>${esc(b.date)} · ${esc(tr(b.method))}</small></span><span class="brew-amount">${esc(b.dose)} g <small>↗</small></span></button>`;
}
function renderDashboard() {
  const y = calendarMonth.getFullYear(),
    m = calendarMonth.getMonth(),
    monthKey = `${y}-${String(m + 1).padStart(2, "0")}`,
    monthBrews = data.brews.filter((b) => b.date.startsWith(monthKey)),
    counts = new Map();
  for (const b of data.brews) counts.set(b.date, (counts.get(b.date) || 0) + 1);
  const methods = {};
  for (const b of monthBrews) methods[b.method] = (methods[b.method] || 0) + 1;
  const popular = Object.keys(methods).sort(
    (a, b) => methods[b] - methods[a],
  )[0];
  const title = calendarMonth.toLocaleDateString(
      preferences.language === "en" ? "en-US" : "zh-CN",
      { year: "numeric", month: "long" },
    ),
    today = date();
  let days = "";
  for (let i = 0; i < calendarMonth.getDay(); i++)
    days += '<span class="calendar-blank" aria-hidden="true"></span>';
  for (let day = 1; day <= new Date(y, m + 1, 0).getDate(); day++) {
    const key = `${monthKey}-${String(day).padStart(2, "0")}`,
      count = counts.get(key) || 0;
    days += `<button class="calendar-day ${count ? "has-brew" : ""} ${key === today ? "is-today" : ""} ${key === selectedBrewDate ? "is-selected" : ""}" data-calendar-day="${key}" aria-pressed="${key === selectedBrewDate}" aria-label="${key} · ${count} ${tr("杯")}"><span>${day}</span><small>${count ? "● " + count : "&nbsp;"}</small></button>`;
  }
  const daily = data.brews.filter((b) => b.date === selectedBrewDate);
  const recent = [...data.brews]
    .reverse()
    .sort((a, b) =>
      (b.date + " " + (b.timeOfDay || "")).localeCompare(
        a.date + " " + (a.timeOfDay || ""),
      ),
    )
    .slice(0, 4);
  $("#dashboard").innerHTML =
    `<div class="dashboard-grid"><section class="dashboard-panel calendar-panel"><div class="dashboard-heading"><div><p class="eyebrow">YOUR DAILY RITUAL</p><h2>${tr("冲煮日历")}</h2></div><button class="text-button" data-calendar-today>${tr("回到今天")}</button></div><div class="calendar-toolbar"><button data-calendar-step="-1" aria-label="${tr("上个月")}">‹</button><strong>${title}</strong><button data-calendar-step="1" aria-label="${tr("下个月")}">›</button></div><div class="calendar-grid"><div class="calendar-weekdays">${["日", "一", "二", "三", "四", "五", "六"].map((d) => `<span>${tr(d)}</span>`).join("")}</div>${days}</div><p class="calendar-legend"><span>● ${tr("有冲煮记录")}</span><span>${tr("点击日期查看当天的咖啡。")}</span></p><div class="selected-day"><div class="dashboard-heading"><strong>${selectedBrewDate}</strong><button class="text-button" data-log-day="${selectedBrewDate}">＋ ${tr("记录这一天")}</button></div>${daily.length ? daily.map(dashboardRecord).join("") : `<p class="dashboard-empty">${tr("当天还没有冲煮记录")}</p>`}</div></section><div class="dashboard-right"><section class="dashboard-panel"><p class="eyebrow">${esc(title)}</p><h2>${tr("本月小结")}</h2><div class="monthly-metrics"><div><strong>${monthBrews.length}</strong><span>${tr("冲煮记录")}</span></div><div><strong>${new Set(monthBrews.map((b) => b.date)).size}</strong><span>${tr("冲煮天数")}</span></div><div><strong>${monthBrews.reduce((n, b) => n + Number(b.dose || 0), 0).toFixed(1)}<small> g</small></strong><span>${tr("咖啡用量")}</span></div></div><div class="favorite-method"><span>${tr("最常用方式")}</span><strong>${popular ? esc(tr(popular)) : tr("暂无记录")}</strong></div></section><section class="dashboard-panel"><div class="dashboard-heading"><h2>${tr("最近冲煮")}</h2><button class="text-button" data-view="brews">${tr("查看全部")} ↗</button></div>${recent.length ? recent.map(dashboardRecord).join("") : `<p class="dashboard-empty">${tr("还没有冲煮记录，从今天的一杯开始。")}</p>`}</section></div></div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.calendarStep) {
    calendarMonth = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + Number(b.dataset.calendarStep),
      1,
    );
    selectedBrewDate = dashboardDate(calendarMonth);
    renderDashboard();
  }
  if (b.dataset.calendarDay) {
    selectedBrewDate = b.dataset.calendarDay;
    renderDashboard();
  }
  if ("calendarToday" in b.dataset) {
    const now = new Date();
    calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    selectedBrewDate = date();
    renderDashboard();
  }
  if (b.dataset.logDay) openForm("brew", { date: b.dataset.logDay });
});

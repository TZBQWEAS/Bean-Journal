// Localize only untouched sample fields; user-authored content stays verbatim.
const sampleDefinitions = {
  yirgacheffe: {
    zh: {
      name: "示例 · 耶加雪菲",
      origin: "埃塞俄比亚",
      roaster: "示例烘焙商",
      process: "水洗",
      flavors: "茉莉,柑橘,蜂蜜",
      notes: "这是一张演示豆卡，可以编辑或删除。",
    },
    en: {
      name: "Sample · Yirgacheffe",
      origin: "Ethiopia",
      roaster: "Sample roaster",
      process: "Washed",
      flavors: "Jasmine,Citrus,Honey",
      notes: "This is a sample bean card. You can edit or delete it.",
    },
  },
  colombia: {
    zh: {
      name: "示例 · 哥伦比亚",
      origin: "哥伦比亚",
      process: "日晒",
      flavors: "莓果,焦糖,可可",
      notes: "演示数据",
    },
    en: {
      name: "Sample · Colombia",
      origin: "Colombia",
      process: "Natural",
      flavors: "Berries,Caramel,Cocoa",
      notes: "Sample data",
    },
  },
};
function sampleKey(bean) {
  if (!bean) return null;
  if (Object.hasOwn(sampleDefinitions, bean.sampleKey)) return bean.sampleKey;
  return (
    Object.keys(sampleDefinitions).find((key) => {
      const base = sampleDefinitions[key].zh;
      return (
        bean.name === base.name &&
        bean.origin === base.origin &&
        bean.notes === base.notes
      );
    }) || null
  );
}
function localizedBean(bean) {
  if (!bean) return bean;
  const key = sampleKey(bean),
    out = { ...bean };
  if (!key) return out;
  const base = sampleDefinitions[key];
  for (const field of Object.keys(base.zh))
    if (bean[field] === base.zh[field])
      out[field] = base[preferences.language][field];
  return out;
}
function preserveSampleFields(record, original) {
  const key = sampleKey(original);
  if (!key) return;
  record.sampleKey = key;
  const displayed = localizedBean(original);
  for (const field of Object.keys(sampleDefinitions[key].zh))
    if (record[field] === displayed[field]) record[field] = original[field];
}

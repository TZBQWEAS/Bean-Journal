# 更新记录

## v1.3 — 2026-10-31

欢迎使用 **Bean Journal · 豆间 v1.3**！本次更新带来 SQLite 自托管多端同步和更完整的设备管理。

### 中文

- 网页、Node.js 服务和 SQLite 集成到一个 Docker 镜像，电脑、手机和 iPad 访问同一实例即可共享豆卡、照片、冲煮、配方和设备。
- 数据通过 `/data` 数据卷持久化，重建容器后仍保留；语言和主题各设备独立保存。
- 设备品牌与型号分别填写，新增买入价格、自定义货币单位、买入日期，允许修改设备类型。
- 设备只停用或重新启用，保留历史记录；已停用设备不出现在新记录的设备选择中。
- 日期统一为 `YYYY-MM-DD`，保留系统日历选择。
- 拦截同一记录的过期编辑，以及跨设备停用或改型后的过期设备选择。
- 修复配置未加载时误存本地、恢复旧数据库后页面不更新的问题，并防止旧表单覆盖恢复的数据。

### 升级须知

**v1.2 的数据在各浏览器内；v1.3 的 Docker 版数据保存在服务器。** 升级前先从旧网站设置导出 JSON 备份。启动 v1.3 后再导入共享实例；导入会替换该实例的全部记录。首次连接空数据库时也可确认导入同地址浏览器的旧数据，不会自动合并多台设备的记录。

必须保留 `/data` 挂载卷，升级时沿用相同卷名及 Compose 项目名。不要执行 `docker compose down -v`。无登录、无多人账号、无离线队列；能访问实例的人都可以读写全部记录。

Docker Hub 标签：`1.3`、`latest`；本次发布平台：`linux/amd64`。回归测试、同步边界测试、容器持久化验证通过，本地预览已由用户确认。

### English

Welcome to **Bean Journal v1.3**! This release adds SQLite-backed self-hosted synchronization and expanded equipment management.

- One Docker image combines the frontend, Node.js service and SQLite. Computers, phones and tablets accessing the same instance share beans, photos, brews, recipes and equipment.
- Persist data in the `/data` volume across container replacement. Language and theme remain device-local.
- Separate equipment brand and model; add purchase price, custom currency and purchase date; allow changing equipment type.
- Deactivate or reactivate equipment while preserving history. Inactive equipment is excluded from new selections.
- Use consistent `YYYY-MM-DD` date fields while retaining native calendar selection.
- Reject stale edits and equipment selections invalidated by another device's deactivation or type change.
- Fix unintended browser-only saves when configuration fails to load, and stale pages after database restoration; protect restored data from old forms.

### Upgrading

**v1.2 stores data per browser; the v1.3 Docker version stores it on the server.** Export JSON from the old site's Settings before upgrading, then import into the shared instance. Import replaces all records. An empty server can offer to import legacy data from the same browser origin; records from different devices are not automatically merged.

Retain the `/data` volume and the same Compose project/volume names. Do not run `docker compose down -v`. There is no login, multiple accounts or offline queue. Anyone who can reach the instance can read and modify all records.

Docker Hub tags: `1.3`, `latest`; published platform: `linux/amd64`. Regression, synchronization-boundary and container-persistence tests passed. The local preview was confirmed by the user.

## v1.2 — 2026-10-31

- 首页数据统计支持点击跳转，豆卡支持整卡点击查看。
- 国家搜索直接展示可点击的匹配结果，支持中英文搜索。
- 修复切换语言后豆卡国家名称未更新的问题，保留产区与庄园原文。
- 新增中深烘选项、筛选及对应豆卡配色。
- 冲煮记录新增萃取计时器，位于时间输入框右侧，停止后自动填入秒数。
- Docker 标签：1.2、latest；平台：linux/amd64。

验证：回归测试及镜像健康检查通过；手机真机测试尚待用户确认。发布说明见 [v1.2](docs/releases/v1.2.md)。

### English

- Click dashboard totals to navigate and click bean cards to open details.
- Search countries in Chinese or English and choose directly from matching results.
- Country names update immediately when switching languages; region and farm text stays unchanged.
- Add medium-dark roast selection, filtering and card colors.
- Add a brew timer beside the extraction-time input; stopping fills in elapsed seconds.
- Docker tags: 1.2, latest; platform: linux/amd64.

Validation: automated regression tests and container health checks passed. Full phone/iPad hardware testing remains pending.


## v1.1 — 2026-10-30

- 修复局域网 HTTP 下新增豆卡、冲煮、设备和配方无法保存的问题。
- 防止连续点击保存产生重复记录；HTTP 保存连接关闭后自动重连，并保留多标签页冲突保护。
- 手机顶部新增折叠菜单，支持横竖屏；iPad 分屏保留展开导航。
- 改善窄屏表单与弹窗滚动，统一 iPad Safari 的输入框、下拉框和日期框尺寸，修复手机首页横向溢出。
- Docker 标签 `1.1` 和 `latest` 均指向本次发布；支持 `linux/amd64`。

数据仍保存在当前浏览器，v1.1 不包含账户或多端同步。更新前建议在设置中导出备份，并保持原访问地址和端口。完整更新记录见 [CHANGELOG.md](CHANGELOG.md)。

### 验证

- 原有功能测试及新增 HTTP 回归测试通过，覆盖重复提交、连接重建、并发新增、过期编辑保护、备份恢复及设备识别。
- 已使用桌面浏览器检查响应式布局和实际局域网 HTTP 保存；真机 Safari 的完整测试矩阵尚未覆盖。

- Fix saving beans, brews, equipment and recipes over LAN HTTP.
- Prevent duplicate submissions, reopen closed HTTP save connections, and retain cross-tab conflict protection.
- Add a collapsible phone menu in both orientations; keep navigation expanded in iPad split view.
- Improve narrow forms and dialog scrolling, align iPad Safari inputs, selects and date controls, and fix horizontal overflow on the phone dashboard.
- Docker tags `1.1` and `latest` point to this release; platform: `linux/amd64`.

Data remains in each browser. v1.1 does not add accounts or cross-device sync. Export a backup in Settings before upgrading and keep the same access address and port. See [CHANGELOG.md](CHANGELOG.md) for the full release notes.

## v1.0 — 2026-10-30

- 豆卡、照片详情、来源地图、中英文与深浅主题。
- 主界面数据总览、冲煮日历和每日记录。
- 设备管理、独立配方与每次冲煮的实际参数。
- 配方选择下显示只读步骤；删除豆卡保留关联记录。
- 修复多标签页覆盖、历史时间、备份校验、设备引用、产地匹配与自定义研磨值误翻译。
- 整理静态源码、开发脚本、测试和第三方许可。

数据仍保存在当前浏览器，没有云同步。该版本的界面版本号为 v1.0。

# 更新记录

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

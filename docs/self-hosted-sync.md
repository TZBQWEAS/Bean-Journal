<p align="center">
  <a href="#中文">中文</a> · <a href="#english">English</a>
</p>

---

# 中文

## SQLite 自托管同步说明

### 存储与同步

浏览器通过同源 `/api/journal` 获取和保存记录，Node.js 事务性写入 `/data/journal.sqlite`。

网页及 API 共用 `8080` 端口，无需独立数据库容器。

豆卡、冲煮、设备和配方分别存为记录，照片随豆卡保存。语言和主题设置保留在浏览器本地。

客户端会在以下情况下检查服务器版本：

- 每 5 秒检查一次；
- 页面重新获得焦点时检查一次。

如果服务器版本没有变化，则不会重新下载数据。

打开编辑窗口时会暂停自动刷新，避免正在编辑的内容被更新覆盖。

保存记录时，客户端会先获取服务器上的最新数据，将不同记录之间的变化进行合并，然后按照版本号进行条件提交。

如果同一条记录已经被另一台设备修改，则服务器会拒绝覆盖。当前表单内容会被保留，需要重新打开最新记录后再次编辑。

全量导入会更新数据代次（generation），从而阻止仍然打开的旧页面覆盖新导入的数据。

当前没有离线保存队列。

如果保存失败，应用不会自动退回浏览器私有存储并将其显示为保存成功。

---

### 迁移和备份

迁移到新的 Bean Journal 实例时：

1. 在旧地址中导出备份；
2. 打开新的实例；
3. 导入之前导出的备份文件。

导入操作会**替换当前全部记录**，不会自动合并来自多个设备的数据。

如果浏览器中存在旧版数据，而服务器数据库为空，应用会提示是否将旧数据迁移到服务器。

旧浏览器中的本地数据不会自动删除。

如果之后继续使用旧版本 Bean Journal 创建记录，这些新记录不会自动同步到服务器版本。

#### 日常备份

推荐使用设置页面中的 **JSON 导出** 功能进行日常备份。

JSON 备份包含照片数据。

#### 文件级备份

如果需要直接备份 SQLite 数据库，应：

1. 停止 Bean Journal 服务；
2. 复制整个 `/data` 数据目录；
3. 完成后重新启动服务。

不建议直接复制正在运行中的单个 SQLite 数据库文件。

恢复备份时同样应该停止服务，并确保运行 Bean Journal 的用户拥有数据目录的写入权限。

建议保留旧备份，以便需要时进行回退。

旧版本的静态 Bean Journal 镜像无法直接读取 SQLite 数据库。

---

### 部署

推荐使用 Docker 命名卷挂载：

```yaml
/data
```

Bean Journal 以非 `root` 用户身份运行。

只要保持 Compose 项目名和卷名不变，重新创建或升级容器不会删除已有记录。

**不要执行：**

```bash
docker compose down -v
```

`-v` 会删除 Compose 使用的数据卷，从而可能删除 Bean Journal 数据。

一个 Bean Journal 应用实例管理一份 SQLite 数据库。

不要将 SQLite 数据库放在网络共享磁盘上，并让多个 Bean Journal 容器同时写入同一个数据库。

---

### 安全说明

Bean Journal v1.3 当前没有加入登录或账户系统。

因此：

> 能够访问 Bean Journal 实例的人，都可以读取和修改其中的全部记录。

项目代码公开并不会导致不同用户自行部署的 Bean Journal 实例之间共享数据。

每个自托管实例拥有自己独立的数据库。

跨站写入检查用于减少异常来源请求，但**不能代替用户身份认证**。

如果使用反向代理，应保留原始 `Host` 请求头。

必要时可以设置：

```text
PUBLIC_ORIGIN
```

将其指定为 Bean Journal 唯一允许的公开访问地址。

---

### 当前限制

Bean Journal v1.3 主要面向**单个共享咖啡空间**使用。

当前数据同步方式采用完整快照保存。

限制包括：

- 单次请求最大约 `64 MiB`；
- 最多约 `10,000` 条记录；
- 大量照片会增加网络传输量；
- 大量照片会增加浏览器和服务器内存占用；
- 没有分页；
- 没有独立照片存储；
- 没有多账户系统；
- 没有实时推送；
- 没有离线保存队列。

数据库使用 **Node.js 内置 SQLite**，运行时无需额外的 npm SQLite 依赖。

---

### v1.3 Docker 镜像

Bean Journal v1.3 发布镜像：

```bash
tzbqweas/bean-journal:1.3
```

本次发布同时更新：

```bash
tzbqweas/bean-journal:latest
```

服务每次启动时都会生成新的实例标识。

因此，在恢复数据库或重新创建服务后，页面能够识别新的服务器实例并接受其中的数据。

旧的编辑表单需要重新打开后再保存。

如果服务端模式配置缺失，Bean Journal 不会静默切换到浏览器私有存储。

---

<p align="center">
  <a href="#sqlite-自托管同步说明">↑ 返回顶部</a>
</p>

---

# English

## SQLite Self-Hosted Sync Guide

### Storage and Synchronization

The browser loads and saves records through the same-origin `/api/journal` endpoint.

Node.js writes data transactionally to:

```text
/data/journal.sqlite
```

The web interface and API share port `8080`, so no separate database container is required.

Beans, brews, equipment, and recipes are stored as individual records. Photos are stored together with bean records.

Language and theme preferences remain stored locally in the browser.

The client checks the server version:

- every 5 seconds;
- whenever the page regains focus.

If the server version has not changed, the client does not download the data again.

Automatic refresh is paused while an edit window is open to prevent changes from interrupting an active edit.

Before saving, the client first retrieves the latest server data, merges changes made to different records, and then submits the update conditionally using the current version number.

If the same record has already been modified by another device, the server rejects the overwrite.

The current form is preserved, and the latest version of the record must be reopened before editing again.

A full import updates the data generation identifier. This prevents older pages that are still open from overwriting newly imported data.

There is currently no offline save queue.

If saving fails, Bean Journal does not silently fall back to private browser storage and report the operation as successful.

---

### Migration and Backups

When moving to a new Bean Journal instance:

1. Export a backup from the old instance.
2. Open the new instance.
3. Import the exported backup.

An import **replaces all existing records**.

It does not automatically merge records from multiple devices.

If legacy browser data exists and the server database is empty, Bean Journal can prompt the user to migrate the browser data to the server.

Existing legacy browser data is not automatically deleted.

Any records created later using an older browser-only version of Bean Journal will not automatically synchronize with the server-based version.

#### Regular Backups

For normal backups, use the **JSON export** function available in Settings.

The JSON backup includes photos.

#### File-Level Backups

For a direct SQLite backup:

1. Stop the Bean Journal service.
2. Copy the entire `/data` directory.
3. Restart the service after the copy is complete.

Do not copy only the active SQLite database file while Bean Journal is running.

The service should also be stopped before restoring a file-level backup.

Make sure the user running Bean Journal has write permission to the restored data directory.

Keeping older backups is recommended so that previous versions can be restored if necessary.

Older static Bean Journal images cannot directly read the SQLite database.

---

### Deployment

Use a Docker named volume mounted at:

```text
/data
```

Bean Journal runs as a non-`root` user.

As long as the Compose project name and volume name remain unchanged, rebuilding or upgrading the container will not delete existing records.

**Do not run:**

```bash
docker compose down -v
```

The `-v` option removes Compose volumes and may delete Bean Journal data.

Each Bean Journal application instance should manage a single SQLite database.

Do not place the SQLite database on a network share and allow multiple Bean Journal containers to write to the same database simultaneously.

---

### Security

Bean Journal v1.3 currently does not include authentication or user accounts.

Therefore:

> Anyone who can access the Bean Journal instance can read and modify all records stored in it.

Publishing the Bean Journal source code does not cause independently self-hosted instances to share data.

Each self-hosted instance has its own independent database.

Cross-origin write checks help reject requests from unexpected origins, but they are **not a replacement for authentication**.

When using a reverse proxy, preserve the original `Host` header.

If necessary, configure:

```text
PUBLIC_ORIGIN
```

to define the single public origin that is allowed to access the instance.

---

### Current Limitations

Bean Journal v1.3 is primarily designed for a **single shared coffee space**.

Synchronization currently uses full snapshots.

Current limitations include:

- maximum request size of approximately `64 MiB`;
- maximum of approximately `10,000` records;
- large numbers of photos increase network usage;
- large numbers of photos increase browser and server memory usage;
- no pagination;
- no separate photo storage;
- no multi-user account system;
- no real-time push synchronization;
- no offline save queue.

The database uses **Node.js built-in SQLite**, so no additional SQLite npm runtime dependency is required.

---

### v1.3 Docker Image

The Bean Journal v1.3 release image is:

```bash
tzbqweas/bean-journal:1.3
```

The following tag is also updated with this release:

```bash
tzbqweas/bean-journal:latest
```

The server generates a new instance identifier every time it starts.

This allows browser clients to recognize a restored or recreated server instance and accept its database contents.

Any old edit forms should be reopened before saving.

If the server-mode configuration is missing, Bean Journal will not silently fall back to private browser storage.

---

<p align="center">
  <a href="#sqlite-self-hosted-sync-guide">↑ Back to top</a>
</p>

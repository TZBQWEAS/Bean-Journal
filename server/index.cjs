"use strict";
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { openStore } = require("./store.cjs");
const root = path.resolve(__dirname, "../dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
};
function createJournalServer({
  dataDir = process.env.DATA_DIR || path.resolve(__dirname, "../data"),
  maxBodyBytes = 64 * 1024 * 1024,
} = {}) {
  const store = openStore(dataDir);
  const instanceId = randomUUID();
  function json(res, status, value) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(value));
  }
  async function readBody(req) {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxBodyBytes)
        throw Object.assign(Error("too_large"), { status: 413 });
      chunks.push(chunk);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw Object.assign(Error("invalid"), { status: 400 });
    }
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname === "/healthz" && req.method === "GET") {
        store.revision();
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok\n");
        return;
      }
      if (pathname === "/api/journal") {
        if (req.method === "GET") {
          const etag = '"' + instanceId + ":" + store.revision() + '"';
          res.setHeader("ETag", etag);
          if (req.headers["if-none-match"] === etag) {
            res.writeHead(304);
            res.end();
            return;
          }
          json(res, 200, { ...store.read(), instanceId });
          return;
        }
        if (req.method === "PUT") {
          // No authentication by design. Reject browser cross-site form/fetch writes.
          if (
            req.headers["x-bean-journal"] !== "1" ||
            !String(req.headers["content-type"] || "").startsWith(
              "application/json",
            ) ||
            req.headers["sec-fetch-site"] === "cross-site"
          ) {
            json(res, 403, { error: "cross_site" });
            return;
          }
          if (req.headers.origin) {
            const origin = new URL(req.headers.origin);
            const allowed = process.env.PUBLIC_ORIGIN;
            if (origin.host !== req.headers.host && origin.origin !== allowed) {
              json(res, 403, { error: "cross_site" });
              return;
            }
          }
          const body = await readBody(req);
          if (!body || typeof body !== "object" || Array.isArray(body)) {
            json(res, 400, { error: "invalid" });
            return;
          }
          if (body.expectedInstance !== instanceId) {
            json(res, 409, { error: "conflict" });
            return;
          }
          const saved = {
            ...store.save(body.journal, body.expectedRevision),
            instanceId,
          };
          res.setHeader("ETag", '"' + instanceId + ":" + saved.revision + '"');
          json(res, 200, saved);
          return;
        }
        json(res, 405, { error: "method_not_allowed" });
        return;
      }
      if (pathname.startsWith("/api/")) {
        json(res, 404, { error: "not_found" });
        return;
      }
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return;
      }
      if (pathname === "/runtime-config.js") {
        res.writeHead(200, {
          "Content-Type": "text/javascript; charset=utf-8",
        });
        res.end(req.method === "HEAD" ? "" : "window.JOURNAL_SERVER = true;");
        return;
      }
      if (
        pathname.includes("\\") ||
        pathname.split("/").some((part) => part.startsWith("."))
      ) {
        res.writeHead(404);
        res.end();
        return;
      }
      const file = path.resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (
        !file.startsWith(root + path.sep) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile() ||
        !fs.realpathSync(file).startsWith(root + path.sep)
      ) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const stat = fs.statSync(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Content-Length": stat.size,
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      fs.createReadStream(file)
        .on("error", () => res.destroy())
        .pipe(res);
    } catch (error) {
      if (!res.headersSent && !res.destroyed)
        json(res, error.status || 500, {
          error: error.status ? error.message : "server_error",
        });
      if (!error.status)
        console.error("Request failed:", error.code || error.name);
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  return { server, store };
}
if (require.main === module) {
  const { server, store } = createJournalServer();
  const port = Number(process.env.PORT || 8080),
    host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () =>
    console.log("Bean Journal SQLite listening on " + host + ":" + port),
  );
  const shutdown = () =>
    server.close(() => {
      store.close();
      process.exit(0);
    });
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
module.exports = { createJournalServer };

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "dist");
const port = Number(process.env.PORT || 4173);
const backendOrigin = process.env.HUB_BACKEND_ORIGIN || "http://backend-web:8000";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webmanifest": "application/manifest+json",
};

const host = process.env.HOST || "0.0.0.0";

createServer(async (req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (pathname === "/healthz" || pathname === "/health") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (pathname.startsWith("/api/")) {
    try {
      const target = new URL(req.url || pathname, backendOrigin);
      const headers = { ...req.headers };
      delete headers.host;
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const upstream = await fetch(target, {
        method: req.method,
        headers,
        body: ["GET", "HEAD"].includes(req.method || "GET")
          ? undefined
          : Buffer.concat(chunks),
        redirect: "manual",
      });
      res.statusCode = upstream.status;
      upstream.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ detail: "Serviço temporariamente indisponível." }));
    }
    return;
  }
  let file = join(root, pathname === "/" ? "index.html" : pathname);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
  res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
  createReadStream(file).pipe(res);
}).listen(port, host, () => console.log(`hub-v7m em http://${host}:${port}`));

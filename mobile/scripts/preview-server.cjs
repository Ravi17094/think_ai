// Serve the actual Expo web export and keep laptop/phone API requests on one origin.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../web-preview");
const port = Number(process.env.PREVIEW_WEB_PORT || 8086);
const apiPort = Number(process.env.PREVIEW_API_PORT || 5016);
const types = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const server = http.createServer((req, res) => {
  if (/^\/(api(?:\/|$)|local-practice-media(?:\/|$))/.test(req.url)) {
    const proxy = http.request({ hostname: "127.0.0.1", port: apiPort, path: req.url, method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${apiPort}`, "x-forwarded-host": req.headers.host || "" } }, response => {
      res.writeHead(response.statusCode || 502, response.headers); response.pipe(res);
    });
    proxy.on("error", () => { if (!res.headersSent) res.writeHead(503, { "content-type": "application/json" }); res.end(JSON.stringify({ success: false, message: "Local API is starting. Try again shortly." })); });
    req.pipe(proxy); return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch { res.writeHead(400); res.end("Invalid URL"); return; }
  let file = path.resolve(root, "." + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end("Forbidden"); return; }
  if (file === root || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (path.extname(pathname)) { res.writeHead(404); res.end("Not found"); return; }
    file = path.join(root, "index.html");
  }
  if (!fs.existsSync(file)) { res.writeHead(503); res.end("Build the preview first with Start-Preview.ps1."); return; }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  const stream = fs.createReadStream(file); stream.on("error", () => res.destroy()); stream.pipe(res);
});
server.listen(port, "0.0.0.0", () => console.log(`Preview: http://localhost:${port}; API proxy: 127.0.0.1:${apiPort}`));

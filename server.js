/**
 * server.js — Tiny Express server for the Burp Suite Demo
 *
 * Run:  node server.js
 * URL:  http://localhost:3000
 *
 * Set your browser proxy to 127.0.0.1:8080 (Burp Suite) to intercept.
 */

const http  = require("http");
const fs    = require("fs");
const path  = require("path");
const url   = require("url");

const PORT = 3000;

// Valid credentials (server-side)
const VALID_USERS = {
  admin: "admin123",
  user:  "pass1234",
};

// ─── MIME types ───────────────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
};

// ─── Helper: send JSON ────────────────────────────────────────────────────────
function sendJSON(res, statusCode, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(statusCode, {
    "Content-Type":                "application/json",
    "Content-Length":              Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "X-Demo-Lab":                  "BurpSuite-Auth-Bypass",
  });
  res.end(body);
}

// ─── Read body from POST request ──────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end",  () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

// ─── Server ───────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ── Handle CORS preflight ──────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  POST /api/login  — The vulnerable endpoint
  //
  //  Server correctly validates credentials.
  //  ✔ Valid   → 200 OK  + { isLogin: true  }
  //  ✖ Invalid → 403 Forbidden + { isLogin: false }
  //
  //  VULNERABILITY: The client (auth.js) trusts `isLogin` from the response
  //  body. Burp Suite can intercept the 403 response and change:
  //    isLogin: false  →  isLogin: true
  //    (and status 403 → 200)
  //  The client will then grant full access.
  // ─────────────────────────────────────────────────────────────────────────
  if (pathname === "/api/login" && req.method === "POST") {
    const { username, password } = await readBody(req);

    console.log(`\n[LOGIN ATTEMPT]  username="${username}"  password="${password}"`);

    if (VALID_USERS[username] && VALID_USERS[username] === password) {
      console.log(`[SERVER]  ✅  200 OK  →  { isLogin: true }`);
      return sendJSON(res, 200, {
        isLogin: true,
        user:    username,
        role:    "admin",
        token:   "eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJ1c2VyIjoiYWRtaW4ifQ.",
      });
    } else {
      console.log(`[SERVER]  ❌  403 Forbidden  →  { isLogin: false }`);
      console.log(`[SERVER]  💡  Intercept this response in Burp and change to:`);
      console.log(`              HTTP/1.1 200 OK`);
      console.log(`              { "isLogin": true }`);
      return sendJSON(res, 403, {
        isLogin: false,
        error:   "Invalid username or password",
        code:    403,
      });
    }
  }

  // ── Serve static files ────────────────────────────────────────────────────
  let filePath = pathname === "/" ? "/index.html" : pathname;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    return res.end(content);
  }

  // 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
});

server.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   🔐  SecureBank — Burp Suite Demo Server           ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║   URL  →  http://localhost:${PORT}                     ║`);
  console.log("║   Proxy: Set browser to 127.0.0.1:8080 (Burp)       ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║   Valid Credentials:                                 ║");
  console.log("║     admin / admin123                                 ║");
  console.log("║     user  / pass1234                                 ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║   Bypass Steps (Burp Suite):                         ║");
  console.log("║   1. Enable Intercept in Proxy tab                   ║");
  console.log("║   2. Submit wrong password → capture POST /api/login ║");
  console.log("║   3. Forward request → intercept the RESPONSE        ║");
  console.log("║   4. Change 403 → 200  and  isLogin:false → true     ║");
  console.log("║   5. Forward → dashboard opens!                      ║");
  console.log("╚══════════════════════════════════════════════════════╝");
});

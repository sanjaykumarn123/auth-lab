/**
 * auth.js — Vulnerable Authentication Logic (GitHub Pages / Static Version)
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  VULNERABILITY: CLIENT-SIDE RESPONSE TRUST                  ║
 * ║                                                              ║
 * ║  Flow for wrong password (Burp Suite demo):                  ║
 * ║  1. Client sends POST-like fetch to /api/auth.json           ║
 * ║  2. Server returns: { "isLogin": false }  (403 simulated)    ║
 * ║  3. Burp intercepts the RESPONSE and changes:                ║
 * ║       "isLogin": false  →  "isLogin": true                   ║
 * ║  4. Client trusts the modified response → ACCESS GRANTED     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ── Valid credentials (only used for "correct login" demo) ────────────────────
const VALID_USERS = {
  admin: "admin123",
  user:  "pass1234",
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const loginForm  = document.getElementById("loginForm");
const loginPage  = document.getElementById("loginPage");
const dashPage   = document.getElementById("dashboardPage");
const errorMsg   = document.getElementById("errorMsg");
const submitBtn  = document.getElementById("submitBtn");
const btnText    = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");
const loggedUser = document.getElementById("loggedUser");
const authBadge  = document.getElementById("authBadge");
const logoutBtn  = document.getElementById("logoutBtn");
const togglePw   = document.getElementById("togglePw");
const pwInput    = document.getElementById("password");

// ── Password visibility toggle ────────────────────────────────────────────────
togglePw.addEventListener("click", () => {
  pwInput.type = pwInput.type === "password" ? "text" : "password";
  togglePw.textContent = pwInput.type === "password" ? "👁" : "🙈";
});

// ── Login form submit ─────────────────────────────────────────────────────────
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.classList.add("hidden");

  const username = document.getElementById("username").value.trim();
  const password = pwInput.value;

  setLoading(true);

  // ─────────────────────────────────────────────────────────────────────────
  //  STEP 1: Show normal login works (correct credentials)
  //  This path does NOT make a network call — it's just for demo part 1.
  // ─────────────────────────────────────────────────────────────────────────
  if (VALID_USERS[username] && VALID_USERS[username] === password) {
    await sleep(800); // simulate network delay
    grantAccess(username, {
      isLogin: true,
      user: username,
      role: "admin",
      note: "Correct credentials — no interception needed",
    });
    setLoading(false);
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  STEP 2: Wrong password — fetch /api/auth.json (INTERCEPTABLE BY BURP)
  //
  //  This is the VULNERABLE part. The client fetches the auth check endpoint.
  //  The server (GitHub Pages) always returns:
  //      { "isLogin": false, "error": "Invalid username or password" }
  //
  //  Burp Suite sits in the middle and can change this response to:
  //      { "isLogin": true }
  //
  //  The client BLINDLY trusts this value → auth bypass!
  // ─────────────────────────────────────────────────────────────────────────
  try {
    console.log("%c[REQUEST]  GET /auth.json  (intercept this response in Burp!)",
      "color:#f59e0b; font-weight:bold; font-family:monospace;");

    const response = await fetch("./auth.json", {
      method: "GET",
      headers: {
        "X-Username": username,
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store", // prevent caching so Burp always sees it
    });

    // ⚠ VULNERABLE: We parse and trust whatever the response says
    const data = await response.json();

    console.log("%c[RESPONSE] Status: " + response.status, "color:#64748b; font-family:monospace;");
    console.log("%c" + JSON.stringify(data, null, 2),
      `color:${data.isLogin ? "#6ee7b7" : "#f87171"}; font-family:monospace;`);

    if (!data.isLogin) {
      console.log(
        "%c[BURP TIP] Intercept this response → change isLogin: false → true → Forward",
        "color:#f59e0b; font-style:italic; font-family:monospace;"
      );
    }

    // ⚠ VULNERABLE CHECK — trusts response body, not server session
    if (data.isLogin === true) {
      grantAccess(data.user || username, data);
    } else {
      showError();
    }

  } catch (err) {
    console.error("[ERROR] Fetch failed:", err);
    showError();
  }

  setLoading(false);
});

// ── Grant access ──────────────────────────────────────────────────────────────
function grantAccess(username, responseData) {
  loggedUser.textContent = `👤 ${username}`;

  const bypassed = !VALID_USERS[username] ||
                   document.getElementById("password").value !== VALID_USERS[username];

  authBadge.innerHTML = `
    <div style="color:#94a3b8;margin-bottom:6px;font-size:.75rem;letter-spacing:.5px;">
      ${bypassed
        ? "⚠️  INTERCEPTED RESPONSE (modified by Burp Suite)"
        : "✅  LEGITIMATE RESPONSE (correct credentials)"}
    </div>
    <div>GET <span style="color:#a5b4fc;">/api/auth.json</span></div>
    <div>HTTP/1.1 <span style="color:#6ee7b7;font-weight:700;">200 OK</span>
      ${bypassed ? '<span style="color:#f87171;margin-left:8px;">← was 403</span>' : ""}
    </div>
    <div>Content-Type: application/json</div>
    <div style="margin-top:8px;">{</div>
    <div>&nbsp;&nbsp;"isLogin": <span style="color:#6ee7b7;font-weight:700;">true</span>
      ${bypassed ? '<span style="color:#f87171;margin-left:8px;">← was false</span>' : ""},
    </div>
    <div>&nbsp;&nbsp;"user": "${username}"</div>
    <div>}</div>
  `;

  loginPage.classList.remove("active");
  dashPage.classList.add("active");
}

// ── Show error ─────────────────────────────────────────────────────────────────
function showError() {
  errorMsg.classList.remove("hidden");
  errorMsg.style.animation = "none";
  void errorMsg.offsetWidth;
  errorMsg.style.animation = "";
}

// ── Loading state ──────────────────────────────────────────────────────────────
function setLoading(state) {
  submitBtn.disabled = state;
  btnText.textContent = state ? "Authenticating..." : "Sign In";
  btnSpinner.classList.toggle("hidden", !state);
}

// ── Logout ────────────────────────────────────────────────────────────────────
logoutBtn.addEventListener("click", () => {
  dashPage.classList.remove("active");
  loginPage.classList.add("active");
  loginForm.reset();
  errorMsg.classList.add("hidden");
});

// ── Utility ───────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

# 🔐 SecureBank — Burp Suite Auth Bypass Lab

> A deliberately vulnerable login page for demonstrating HTTP response manipulation using Burp Suite.

## Live Demo
👉 **[Launch Demo](https://YOUR-USERNAME.github.io/securebank)**

---

## 🎯 Vulnerability
**Client-Side Response Trust** — The frontend blindly trusts `isLogin` from the HTTP response body. If Burp Suite intercepts and flips `"isLogin": false` → `"isLogin": true`, authentication is bypassed.

## 🔑 Demo Credentials
| Username | Password |
|----------|----------|
| `admin`  | `admin123` |
| `user`   | `pass1234` |

## 🛠 Burp Suite Steps
1. Configure browser proxy → `127.0.0.1:8080`
2. Enable **Intercept** in Burp → Proxy tab
3. Enter `admin` / `wrongpassword` → Submit
4. Forward the **request**
5. Intercept the **response** — you'll see `{ "isLogin": false }`
6. Change → `{ "isLogin": true }` → Forward
7. 🎉 Dashboard opens!

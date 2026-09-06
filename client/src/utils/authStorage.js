import Cookies from "js-cookie";
import { isDevLoginEnabled } from "./devLogin";

const SESSION_KEY = "waps.devLogin";
const REQUEST_KEY = "waps.devLogin.requestId";
const authKeys = new Set(["authToken", "userName", "userRole", "lastPage"]);
const readSession = () => isDevLoginEnabled() ? JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") : null;

export function getDevSessionId() {
  let id = sessionStorage.getItem(REQUEST_KEY);
  if (!id) {
    id = window.crypto.randomUUID();
    sessionStorage.setItem(REQUEST_KEY, id);
  }
  return id;
}

export function saveDevSession({ accessToken, userName, role, expiresAt }) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    authToken: accessToken, userName, userRole: role, expiresAt, lastPage: "/",
  }));
}

function releaseDevSession() {
  const sessionId = sessionStorage.getItem(REQUEST_KEY);
  if (sessionId) {
    // Keepalive allows logout navigation to proceed while returning the account.
    fetch(`${process.env.REACT_APP_API_BASE_URL || "http://localhost:8080"}/auth/login-dev/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
      keepalive: true,
    }).catch(() => {}); // An unreachable server will reclaim the account at expiry.
    sessionStorage.removeItem(REQUEST_KEY);
  }
}

export function clearDevSession() {
  if (!isDevLoginEnabled()) return;
  releaseDevSession();
  sessionStorage.removeItem(SESSION_KEY);
}

// Normal logins use cookies; development sessions are isolated to their browser tab.
const authStorage = {
  get(key) {
    const session = readSession();
    if (session && authKeys.has(key)) {
      if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) return undefined;
      return session[key];
    }
    return Cookies.get(key);
  },
  set(key, value, options) {
    const session = readSession();
    if (session && authKeys.has(key)) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, [key]: value }));
      return;
    }
    return Cookies.set(key, value, options);
  },
  remove(key, options) {
    const session = readSession();
    if (session && authKeys.has(key)) {
      if (key === "authToken") {
        releaseDevSession();
        // Retain an empty tab session so another account's cookies cannot leak in.
        sessionStorage.setItem(SESSION_KEY, "{}");
      } else {
        delete session[key];
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
      return;
    }
    return Cookies.remove(key, options);
  },
};

export default authStorage;

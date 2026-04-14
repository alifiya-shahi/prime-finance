import { TOKEN_KEY } from "./constants";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload;
}

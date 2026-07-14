const API_PREFIX = "/api/v1";

function versionParts(value) {
  return String(value || "0.0.0").split(".").slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
}

export function compareCompanionVersion(current, required) {
  if (current?.api_version != null && Number(current.api_version) !== Number(required.api_version)) {
    return "api_incompatible";
  }
  const actual = versionParts(current?.version);
  const minimum = versionParts(required?.min_version);
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] > minimum[index]) return "compatible";
    if (actual[index] < minimum[index]) return "update_required";
  }
  return "compatible";
}

function trimTrailingSlash(value) {
  return String(value || "http://127.0.0.1:43127").replace(/\/+$/, "");
}

export function createDeltaCompanionClient({
  baseUrl = "http://127.0.0.1:43127",
  siteOrigin = window.location.origin,
  storage = window.localStorage,
} = {}) {
  const root = trimTrailingSlash(baseUrl);
  const tokenKey = `pp-tools.delta.token:${siteOrigin}`;

  const getToken = () => storage.getItem(tokenKey);
  const hasToken = () => Boolean(getToken());
  const clearToken = () => storage.removeItem(tokenKey);

  const request = async (path, {
    method = "GET",
    body,
    auth = true,
    responseType = "json",
  } = {}) => {
    const headers = {};
    if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
    if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
    const options = {
      method,
      headers,
      body: body instanceof FormData ? body : body == null ? undefined : JSON.stringify(body),
      targetAddressSpace: "loopback",
    };
    const url = `${root}${API_PREFIX}${path}`;
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      if (error?.name === "NotAllowedError") {
        throw Object.assign(new Error("Local network permission was denied"), {
          code: "permission_denied",
          cause: error,
        });
      }
      if (!(error instanceof TypeError)) throw error;
      const fallback = { ...options };
      delete fallback.targetAddressSpace;
      try {
        response = await fetch(url, fallback);
      } catch (retryError) {
        if (retryError?.name === "NotAllowedError") {
          throw Object.assign(new Error("Local network permission was denied"), {
            code: "permission_denied",
            cause: retryError,
          });
        }
        throw Object.assign(new Error("Companion is unavailable"), {
          code: "companion_unavailable",
          cause: retryError,
        });
      }
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const apiError = payload?.error || {};
      throw Object.assign(new Error(apiError.code || `HTTP ${response.status}`), {
        code: apiError.code || "companion_request_failed",
        details: apiError.details || {},
        status: response.status,
      });
    }
    if (response.status === 204) return null;
    return responseType === "blob" ? response.blob() : response.json();
  };

  const pair = async (code) => {
    const result = await request("/pair", { method: "POST", body: { code }, auth: false });
    storage.setItem(tokenKey, result.token);
    return result;
  };

  const revokePairing = async () => {
    try {
      await request("/pair/revoke", { method: "POST" });
    } finally {
      clearToken();
    }
  };

  return {
    health: () => request("/health", { auth: false }),
    pair,
    revokePairing,
    hasToken,
    clearToken,
    listPlayers: (query = "") => request(`/players?q=${encodeURIComponent(query)}`),
    getPlayer: (id) => request(`/players/${id}`),
    updatePlayer: (id, patch) => request(`/players/${id}`, { method: "PUT", body: patch }),
    deletePlayer: (id) => request(`/players/${id}`, { method: "DELETE" }),
    manualLookup: (files) => {
      const form = new FormData();
      Array.from(files || []).forEach((file, index) => {
        form.append("images", file, file.name || `screenshot-${index + 1}.png`);
      });
      return request("/manual-lookup", { method: "POST", body: form });
    },
    autoLookup: (query) => request("/auto-lookup", { method: "POST", body: { query } }),
    getJob: (id) => request(`/jobs/${id}`),
    cancelJob: (id) => request(`/jobs/${id}/cancel`, { method: "POST" }),
    listJobs: () => request("/jobs"),
    getUsage: () => request("/usage"),
    getCalibration: () => request("/calibration"),
    getScreenshot: () => request("/screenshot.png", { responseType: "blob" }),
    saveCalibration: (name, blob) => {
      const form = new FormData();
      form.append("image", blob, `${name}.png`);
      return request(`/calibration/${encodeURIComponent(name)}`, { method: "POST", body: form });
    },
    deleteCalibration: (name) => request(`/calibration/${encodeURIComponent(name)}`, { method: "DELETE" }),
  };
}

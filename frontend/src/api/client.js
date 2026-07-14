export function buildApiUrl(baseUrl, path) {
  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedPath = `/${String(path || "").replace(/^\/+/, "")}`;
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}

export async function apiFetch(path, options = {}) {
  const { headers: customHeaders = {}, ...requestOptions } = options;
  const response = await fetch(path, {
    ...requestOptions,
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...customHeaders,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data && data.error ? data.error : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return data;
}

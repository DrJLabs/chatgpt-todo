const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedMetadata = null;

export async function fetchMcpMetadata(url) {
  const now = Date.now();
  if (cachedMetadata && now - cachedMetadata.timestamp < CACHE_TTL_MS) {
    return cachedMetadata.payload;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch MCP metadata: ${response.status}`);
  }

  const payload = await response.json();
  cachedMetadata = { timestamp: now, payload };
  return payload;
}

export function clearMetadataCache() {
  cachedMetadata = null;
}

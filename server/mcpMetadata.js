const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map();

export async function fetchMcpMetadata(url, timeoutMs = 10000) {
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && now - entry.timestamp < CACHE_TTL_MS) {
    return entry.payload;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Failed to fetch MCP metadata from ${url}: timeout`);
    }
    throw new Error(`Failed to fetch MCP metadata from ${url}: ${error.message || error}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch MCP metadata from ${url}: ${response.status}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    throw new Error(`Failed to parse MCP metadata JSON from ${url}: ${message}`);
  }

  cache.set(url, { timestamp: now, payload });
  return payload;
}

export function clearMetadataCache(url) {
  if (url) {
    cache.delete(url);
    return;
  }
  cache.clear();
}

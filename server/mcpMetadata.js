const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedMetadata = null;

export async function fetchMcpMetadata(url, timeoutMs = 10000) {
  const now = Date.now();
  if (cachedMetadata && now - cachedMetadata.timestamp < CACHE_TTL_MS) {
    return cachedMetadata.payload;
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

  cachedMetadata = { timestamp: now, payload };
  return payload;
}

export function clearMetadataCache() {
  cachedMetadata = null;
}

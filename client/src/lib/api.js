const RAW_API_BASE = import.meta.env.VITE_TODO_API_BASE_URL?.trim() ?? '';
const API_BASE = RAW_API_BASE.endsWith('/') ? RAW_API_BASE.slice(0, -1) : RAW_API_BASE;

function buildUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
}

export async function apiFetch(path, init = {}) {
  const response = await fetch(buildUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 401) {
    const error = new Error('unauthenticated');
    error.code = 'UNAUTHENTICATED';
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.code = 'REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

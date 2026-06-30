// Base URL of the FastAPI backend. Configure via VITE_API_BASE_URL at build
// time (e.g. when deploying the frontend separately from the backend on
// Render); falls back to localhost for local dev.
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch (networkErr) {
    throw new ApiError(
      'Could not reach the ELstrm backend. Is it running?',
      0
    );
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore - response wasn't JSON
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
}

export async function fetchSources() {
  const data = await request('/api/sources');
  return data.sources;
}

export async function fetchPlaylist({ sourceId, customUrl }) {
  const params = new URLSearchParams();
  if (sourceId) params.set('source', sourceId);
  if (customUrl) params.set('url', customUrl);
  const data = await request(`/api/playlist?${params.toString()}`);
  return data; // { status, total, categories, channels }
}

export async function checkStream(url) {
  const params = new URLSearchParams({ url });
  return request(`/api/stream-check?${params.toString()}`);
}

export { ApiError };

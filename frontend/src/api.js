const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Check that the FastAPI server is running."
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(", ")
      : typeof detail === "string"
        ? detail
        : `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data;
}

export const api = {
  getMetadata: () => request("/api/metadata"),

  getCandidates: (filters = {}) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, item));
      } else if (value !== "" && value !== null && value !== undefined) {
        params.set(key, String(value));
      }
    });

    return request(`/api/candidates?${params.toString()}`);
  },

  getCandidate: (id) =>
    request(`/api/candidates/${encodeURIComponent(id)}`),

  updateShortlist: (id, isShortlisted) =>
    request(`/api/candidates/${encodeURIComponent(id)}/shortlist`, {
      method: "PATCH",
      body: JSON.stringify({ is_shortlisted: isShortlisted }),
    }),

  addTag: (id, tag) =>
    request(`/api/candidates/${encodeURIComponent(id)}/tags`, {
      method: "POST",
      body: JSON.stringify({ tag }),
    }),

  deleteTag: (id, tag) =>
    request(
      `/api/candidates/${encodeURIComponent(id)}/tags?tag=${encodeURIComponent(tag)}`,
      { method: "DELETE" }
    ),

  getAiSummary: (id, targetRole) =>
    request(`/api/candidates/${encodeURIComponent(id)}/ai-summary`, {
      method: "POST",
      body: JSON.stringify({ target_role: targetRole }),
    }),
};


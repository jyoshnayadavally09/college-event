// src/api.js
const BASE_URL = "https://college-event-qi7b.onrender.com";

/**
 * Low-level request helper.
 * - endpoint should start with a leading slash, e.g. "/events"
 * - options: { method, body, token }
 */
async function request(endpoint, { method = "GET", body, token } = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // try to parse JSON but don't crash on empty responses
  const text = await response.text().catch(() => "");
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    // server returned non-json text (rare) — keep raw text under `.raw`
    data = { raw: text };
  }

  if (!response.ok) {
    // prefer server-provided message if present
    const msg = (data && data.message) || response.statusText || "Request failed";
    throw new Error(msg);
  }

  return data;
}

/**
 * If you ever need the raw fetch Response (for headers/status) use rawRequest:
 * const res = await api.rawRequest('/events', { method: 'GET', token });
 */
async function rawRequest(endpoint, { method = "GET", body, token } = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper: try multiple endpoints / shapes to be tolerant to different backends.
 * Useful when a backend sometimes returns { events } or sometimes an array.
 */
async function getEventsFlexible(token) {
  // try primary endpoint
  try {
    const data = await request("/events", { method: "GET", token });
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.events)) return data.events;
    // some APIs return { data: [...] }
    if (Array.isArray(data?.data)) return data.data;
    // fallback: return as-is (caller should handle)
    return data;
  } catch (err) {
    // fallback endpoint attempts (no throw yet)
    try {
      const alt = await request("/events/all", { method: "GET", token });
      if (Array.isArray(alt)) return alt;
      if (Array.isArray(alt?.events)) return alt.events;
      return alt;
    } catch (err2) {
      // rethrow the original error (most likely cause)
      throw err;
    }
  }
}

export const api = {
  rawRequest,

  // Auth
  facultyLogin: (body) => request("/faculty/login", { method: "POST", body }),
  adminLogin: (body) => request("/admin/login", { method: "POST", body }),

  // Events
  getEvents: (token) => getEventsFlexible(token), // tries to be tolerant to response shape
  getEvent: (id, token) => request(`/events/${id}`, { method: "GET", token }),
  createEvent: (body, token) => request("/events/add", { method: "POST", body, token }),
  updateEventDateTime: (id, body, token) =>
    request(`/events/update-datetime/${id}`, { method: "PUT", body, token }),

  /**
   * New helper: update an event's status (Approve / Reject)
   * Server should accept body: { status: "Approved" } or similar.
   * Returns parsed JSON from server (may include updated event under different keys).
   */
  updateEventStatus: (id, status, token) =>
    request(`/events/update/${id}`, { method: "PUT", body: { status }, token }),

  // Faculty add results
  addResults: (eventId, body, token) =>
    request(`/events/${eventId}/results`, { method: "POST", body, token }),

  // Export CSV (blob)
  exportRegistrations: async (eventId, token) => {
    const url = `${BASE_URL}/events/${eventId}/registrations/export`;
    const res = await fetch(url, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Export failed: ${res.statusText}`);
    }

    return await res.blob();
  },

  // Registrations (for a specific event)
  getRegistrations: (eventId, token) =>
    request(`/events/${eventId}/registrations`, { method: "GET", token }),

  // ---------- NEW: registrations belonging to the logged-in student ----------
  getMyRegistrations: (token) =>
    request("/student/registrations", { method: "GET", token }),

  // alternative route name
  getRegistrationsForMe: (token) =>
    request("/me/registrations", { method: "GET", token }),

  // ------------------ NEW: FormData-aware helpers ------------------
  /**
   * createEventForm(formData, token)
   * - formData: instance of FormData (files + fields)
   * - token: optional auth token
   */
  createEventForm: async (formData, token) => {
    const url = `${BASE_URL}/events/add`;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(url, {
      method: "POST",
      headers, // DON'T set Content-Type when sending FormData
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // try parse json message if available
      try {
        const j = text ? JSON.parse(text) : null;
        throw new Error((j && j.message) || text || res.statusText);
      } catch (e) {
        throw new Error(text || res.statusText);
      }
    }

    // tolerate empty body
    const text = await res.text().catch(() => "");
    try {
      return text ? JSON.parse(text) : {};
    } catch (err) {
      return { raw: text };
    }
  },

  /**
   * Convenience: upload image-only endpoints if your backend exposes one.
   * Example usage left commented — implement if needed on server.
   */
  // uploadImage: async (formData, token) => {
  //   const url = `${BASE_URL}/upload`;
  //   const headers = token ? { Authorization: `Bearer ${token}` } : {};
  //   const res = await fetch(url, { method: "POST", headers, body: formData });
  //   if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  //   return res.json().catch(() => ({}));
  // },
};

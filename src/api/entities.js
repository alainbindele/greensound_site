import { api, ApiError } from './client.js';

/**
 * Content entities.
 *
 * Each export exposes the same small surface:
 *
 *   Entity.list(sort)             -> Record[]
 *   Entity.filter(query, sort)    -> Record[]
 *   Entity.get(id)                -> Record
 *   Entity.create(data)           -> Record
 *   Entity.update(id, data)       -> Record
 *   Entity.delete(id)             -> void
 *
 * `sort` is a field name, optionally prefixed with "-" for descending
 * ("-created_date"). `filter` matches fields for equality.
 */

function createEntity(name) {
  const basePath = `/api/entities/${name}`;

  const buildQuery = (filter, sort, limit) => {
    const params = new URLSearchParams();
    if (filter && Object.keys(filter).length) {
      params.set('filter', JSON.stringify(filter));
    }
    if (sort) params.set('sort', sort);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  return {
    entityName: name,
    list: (sort, limit) => api.get(`${basePath}${buildQuery(null, sort, limit)}`),
    filter: (query, sort, limit) => api.get(`${basePath}${buildQuery(query, sort, limit)}`),
    get: (id) => api.get(`${basePath}/${encodeURIComponent(id)}`),
    create: (data) => api.post(basePath, data),
    update: (id, data) => api.patch(`${basePath}/${encodeURIComponent(id)}`, data),
    delete: (id) => api.delete(`${basePath}/${encodeURIComponent(id)}`),
  };
}

export const Event = createEntity('Event');
export const Article = createEntity('Article');
export const News = createEntity('News');
export const Documentation = createEntity('Documentation');
export const Collaborator = createEntity('Collaborator');

/**
 * The signed-in account.
 *
 * `me()` rejects with a 401 ApiError when nobody is signed in — callers already
 * treat a rejection as "not authenticated".
 */
export const User = {
  me: () => api.get('/api/auth/me'),

  login: (email, password) => api.post('/api/auth/login', { email, password }),

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      // A dead session is already the desired end state.
      if (!(error instanceof ApiError)) throw error;
    }
  },
};

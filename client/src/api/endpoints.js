import client from './client';

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password }),
  register: (name, email, password) => client.post('/auth/register', { name, email, password }),
  me: () => client.get('/me'),
};

export const projectsApi = {
  list: () => client.get('/projects'),
  get: (id) => client.get(`/projects/${id}`),
  create: (data) => client.post('/projects', data),
  update: (id, data) => client.put(`/projects/${id}`, data),
  remove: (id) => client.delete(`/projects/${id}`),
  setMembers: (id, members) => client.put(`/projects/${id}/members`, { members }),
};

export const tasksApi = {
  list: (params) => client.get('/tasks', { params }),
  get: (id) => client.get(`/tasks/${id}`), // note: backend has no GET /:id yet; see README gap note
  create: (data) => client.post('/tasks', data),
  update: (id, data) => client.put(`/tasks/${id}`, data),
  remove: (id) => client.delete(`/tasks/${id}`),
  setDependencies: (id, data) => client.post(`/tasks/${id}/dependencies`, data),
  subtasks: (id) => client.get(`/tasks/${id}/subtasks`),
  relations: (id) => client.get(`/tasks/${id}/relations`),
  addComment: (id, data) => client.post(`/tasks/${id}/comments`, data),
};

export const rcaApi = {
  list: (params) => client.get('/rca', { params }),
  get: (id) => client.get(`/rca/${id}`),
  create: (data) => client.post('/rca', data),
  update: (id, data) => client.put(`/rca/${id}`, data),
  submit: (id, reviewers) => client.put(`/rca/${id}`, { submit: true, reviewers }),
  review: (id, decision, comment) =>
    client.put(`/rca/${id}`, { reviewDecision: { decision, comment } }),
  override: (id, data) => client.post(`/rca/${id}/override`, data),
  addComment: (id, data) => client.post(`/rca/${id}/comments`, data),
};

export const notificationsApi = {
  list: () => client.get('/notifications'),
  markRead: (id) => client.put(`/notifications/${id}/read`),
};

export const analyticsApi = {
  summary: (projectId) => client.get('/analytics/summary', { params: projectId ? { project: projectId } : {} }),
  exportCsv: (params) => client.get('/analytics/export', { params, responseType: 'blob' }),
};

export const preferencesApi = {
  get: (projectId) => client.get(`/preferences/${projectId}`),
  set: (projectId, data) => client.put(`/preferences/${projectId}`, data),
};

export const usersApi = {
  search: (search) => client.get('/users', { params: { search } }),
};

export const uploadsApi = {
  upload: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return client.post('/uploads', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });
  },
};

export const activityApi = {
  list: (params) => client.get('/activity', { params }),
};

export const projectTaskLinksApi = {
  listForTask: (taskId) => client.get('/project-task-links', { params: { task: taskId } }),
  create: (projectId, taskId) => client.post('/project-task-links', { projectId, taskId }),
  remove: (linkId) => client.delete(`/project-task-links/${linkId}`),
};

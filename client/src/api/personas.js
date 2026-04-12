import api from './axios'

export const listPersonas = () =>
  api.get('/api/personas').then(r => r.data)

export const getPersona = (id) =>
  api.get(`/api/personas/${id}`).then(r => r.data.data)

export const createPersona = (data) =>
  api.post('/api/personas', data).then(r => r.data)

export const updatePersona = (id, data) =>
  api.put(`/api/personas/${id}`, data).then(r => r.data)

export const deletePersona = (id) =>
  api.delete(`/api/personas/${id}`).then(r => r.data)

export const analyzePersona = (bio) =>
  api.post('/api/personas/analyze', { bio }).then(r => r.data.data)
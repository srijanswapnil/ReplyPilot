import api from './axios'

export const listReplies = (params = {}) =>
  api.get('/api/replies', { params }).then(r => r.data)

export const getReply = (id) =>
  api.get(`/api/replies/${id}`).then(r => r.data.data)

export const generateReply = (commentId) =>
  api.post(`/api/replies/generate/${commentId}`).then(r => r.data)

export const editReply = (id, text) =>
  api.put(`/api/replies/${id}/edit`, { text }).then(r => r.data)

export const approveReply = (id) =>
  api.put(`/api/replies/${id}/approve`).then(r => r.data)

export const rejectReply = (id) =>
  api.put(`/api/replies/${id}/reject`).then(r => r.data)

export const regenerateReply = (id) =>
  api.post(`/api/replies/${id}/regenerate`).then(r => r.data)

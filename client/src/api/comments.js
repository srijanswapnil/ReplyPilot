import api from './axios'

export const listComments = (params = {}) =>
  api.get('/api/comments', { params }).then(r => r.data)

export const getComment = (id) =>
  api.get(`/api/comments/${id}`).then(r => r.data.data)

export const updateCommentIntent = (id, intent) =>
  api.patch(`/api/comments/${id}/intent`, { intent }).then(r => r.data)

export const classifyComment = (id) =>
  api.post(`/api/comments/${id}/classify`).then(r => r.data)

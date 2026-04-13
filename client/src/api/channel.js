import api from './axios'


export const getChannel = (force = false) =>
  api.get('/api/channel', { params: force ? { force: 'true' } : {} })
    .then(r => r.data.data)


export const getVideos = (params = {}) =>
  api.get('/api/channel/videos', { params }).then(r => r.data)

export const getVideo = (videoId) =>
  api.get(`/api/channel/videos/${videoId}`).then(r => r.data.data)

export const getVideoComments = (videoId, params = {}) =>
  api.get(`/api/channel/videos/${videoId}/comments`, { params }).then(r => r.data)

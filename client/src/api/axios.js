import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',  // Express server port (see server/.env PORT=5000)
  withCredentials: true,
})

// Redirect to Google re-auth if YouTube token has expired
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.data?.reAuthUrl) {
      window.location.href = 'http://localhost:5000' + err.response.data.reAuthUrl
    }
    return Promise.reject(err)
  }
)

export default api

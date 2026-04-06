import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',  // Express server port (see server/.env PORT=5000)
  withCredentials: true,
})


export default api

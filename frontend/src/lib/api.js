import axios from 'axios'

const TOKEN_STORAGE_KEY = 'failsafe_token'

const api = axios.create({
  baseURL: 'http://localhost:8000',
})

api.interceptors.request.use(
  (config) => {
    const token =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(TOKEN_STORAGE_KEY)
        : null

    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)

      if (window.location.pathname !== '/auth') {
        window.location.assign('/auth')
      }
    }

    return Promise.reject(error)
  },
)

export const authAPI = {
  async login({ email, password }) {
    const payload = new URLSearchParams()
    payload.append('username', email)
    payload.append('password', password)

    const response = await api.post('/api/auth/login', payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    return response.data
  },

  async register(payload) {
    const response = await api.post('/api/auth/register', payload)
    return response.data
  },
}

export const dashboardAPI = {
  async getAll() {
    const response = await api.get('/api/dashboard')
    return response.data
  },
}

export const predictAPI = {
  async uploadCSV(file) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/api/predict/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  },
}

export default api

import api from './api'

export const uploadService = {
  uploadFile: (formData: FormData) =>
    api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
}

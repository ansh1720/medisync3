import axios from 'axios';
import toast from 'react-hot-toast';

// Use production API URL when deployed to GitHub Pages
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'ansh1720.github.io' 
    ? 'https://medisync-api-9043.onrender.com/api' 
    : 'http://localhost:5000/api');

// Create axios instance with longer timeout for Render free tier cold starts
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds to handle Render cold starts
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medisync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only handle 401 errors automatically for session management
    // Skip auth endpoints (login/register) - they return 401 for bad credentials, not expired sessions
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('medisync_token');
      localStorage.removeItem('medisync_user');
      window.location.href = '/medisync2/login';
      toast.error('Session expired. Please login again.');
    }
    
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  getConfig: () => api.get('/auth/config', { timeout: 10000 }),
  login: async (credentials) => {
    return api.post('/auth/login', credentials, { timeout: 30000 }); // 30s timeout
  },
  register: (userData) => api.post('/auth/register', userData, { timeout: 30000 }),
  getProfile: () => api.get('/auth/profile', { timeout: 15000 }),
  updateProfile: (data) => api.put('/auth/profile', data, { timeout: 15000 }),
  changePassword: (data) => api.put('/auth/change-password', data, { timeout: 15000 }),
  forgotPassword: (data) => api.post('/auth/forgot-password', data, { timeout: 15000 }), // 15s timeout - email sends in background
  resetPassword: (data) => api.post('/auth/reset-password', data, { timeout: 10000 }),
};

// Risk Assessment API
export const riskAPI = {
  calculateRisk: (data) => api.post('/risk', data),
  getRiskHistory: () => api.get('/risk/history'),
};

// Disease API
export const diseaseAPI = {
  getDiseases: (params) => api.get('/diseases', { params }),
  searchDiseases: (params) => api.get('/diseases/search', { params }),
  enhancedSearch: (query) => api.get('/diseases/enhanced-search', { params: { query } }),
  symptomAnalysis: (symptoms) => api.get('/diseases/symptom-analysis', { params: { symptoms } }),
  getDiseaseById: (id) => api.get(`/diseases/${id}`),
  getDiseaseByName: (name) => api.get(`/diseases/details/${name}`),
  createDisease: (data) => api.post('/diseases', data),
  updateDisease: (id, data) => api.put(`/diseases/${id}`, data),
  deleteDisease: (id) => api.delete(`/diseases/${id}`),
};

// Hospital API
export const hospitalAPI = {
  getAllHospitals: () => api.get('/hospitals'),
  searchHospitals: (params) => api.get('/hospitals/search', { params }),
  getNearbyHospitals: (params) => api.get('/hospitals/nearby', { params }),
  getHospitalDetails: (id) => api.get(`/hospitals/${id}`),
  getHospitalById: (id) => api.get(`/hospitals/${id}`),
  addReview: (hospitalId, review) => api.post(`/hospitals/${hospitalId}/reviews`, review),
};

// Consultation API
export const consultationAPI = {
  // Doctor discovery
  getDoctors: (params) => api.get('/consultation/doctors', { params }),
  getDoctorProfile: (doctorId) => api.get(`/consultation/doctors/${doctorId}`),
  getAvailableSlots: (doctorId, date) => api.get(`/consultation/doctors/${doctorId}/slots`, { params: { date } }),

  // Booking & patient
  bookConsultation: (data) => api.post('/consultation/book', data),
  getMyConsultations: (params) => api.get('/consultation/my-consultations', { params }),
  getConsultation: (id) => api.get(`/consultation/${id}`),
  cancelConsultation: (id, reason) => api.post(`/consultation/${id}/cancel`, { reason }),
  
  // Payment endpoints
  initiatePayment: (id) => api.post(`/consultation/${id}/initiate-payment`),
  verifyPayment: (id, data) => api.post(`/consultation/${id}/verify-payment`, data),
  payConsultation: (id, method) => api.post(`/consultation/${id}/pay`, { method }),
  addFeedback: (id, data) => api.post(`/consultation/${id}/feedback`, data),
  updatePreConsultation: (id, data) => api.put(`/consultation/${id}/pre-consultation`, data),
  joinConsultation: (id) => api.post(`/consultation/${id}/join`),
  uploadDocuments: (id, formData) => api.post(`/consultation/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000 // 2 min for file uploads
  }),

  // Doctor-specific
  getDoctorConsultations: (params) => api.get('/consultation/doctor/consultations', { params }),
  getDoctorStats: () => api.get('/consultation/doctor/stats'),
  acceptConsultation: (id) => api.post(`/consultation/${id}/accept`),
  completeConsultation: (id, data) => api.post(`/consultation/${id}/complete`, data),
  addPrescription: (id, data) => api.post(`/consultation/${id}/prescription`, data),
};

// Equipment API
export const equipmentAPI = {
  addReading: (data) => api.post('/equipment/readings', data),
  getReadings: () => api.get('/equipment/readings'),
  getAnalytics: () => api.get('/equipment/analytics'),
};

// Forum API
export const forumAPI = {
  getPosts: (params) => api.get('/forum/posts', { params }),
  getPost: (postId) => api.get(`/forum/posts/${postId}`),
  createPost: (data) => api.post('/forum/posts', data),
  getComments: (postId, params) => api.get(`/forum/posts/${postId}/comments`, { params }),
  addComment: (postId, comment) => api.post(`/forum/posts/${postId}/comments`, comment),
  likePost: (postId) => api.post(`/forum/posts/${postId}/like`),
};

// News API
export const newsAPI = {
  getNews: (params) => api.get('/news', { params }),
  getAlerts: () => api.get('/news/alerts'),
};

// Verification API
export const verificationAPI = {
  submitVerification: (data) => api.post('/verification/submit', data),
  getVerificationStatus: () => api.get('/verification/status'),
  getPendingVerifications: (params) => api.get('/verification/pending', { params }),
  getVerificationDetails: (doctorId) => api.get(`/verification/doctor/${doctorId}`),
  approveVerification: (doctorId) => api.put(`/verification/approve/${doctorId}`),
  rejectVerification: (doctorId, reason) => api.put(`/verification/reject/${doctorId}`, { reason }),
  getVerifiedDoctors: (params) => api.get('/verification/verified-doctors', { params }),
};

// Admin API
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUserStatus: (userId, isActive) => api.put(`/admin/users/${userId}/status`, { isActive }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getStats: () => api.get('/admin/stats'),
};

export default api;
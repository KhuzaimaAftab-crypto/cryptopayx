import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for performance monitoring
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    // Request interceptor error handled internally
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    
    // Log slow requests in development
    if (process.env.NODE_ENV === 'development' && duration > 2000) {
      // Slow API request monitoring
    }
    
    return response;
  },
  (error) => {
    const { response, request, message } = error;
    
    // Handle different types of errors
    if (response) {
      // Server responded with error status
      const { status, data } = response;
      
      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          localStorage.removeItem('authToken');
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            toast.error('Session expired. Please login again.');
            window.location.href = '/login';
          }
          break;
          
        case 403:
          // Forbidden
          toast.error(data.message || 'Access denied');
          break;
          
        case 404:
          // Not found
          if (!data.message?.includes('token')) {
            toast.error(data.message || 'Resource not found');
          }
          break;
          
        case 422:
          // Validation error
          if (data.errors && Array.isArray(data.errors)) {
            data.errors.forEach(err => toast.error(err.msg || err.message));
          } else {
            toast.error(data.message || 'Validation error');
          }
          break;
          
        case 429:
          // Too many requests
          toast.error('Too many requests. Please try again later.');
          break;
          
        case 500:
          // Server error
          toast.error('Server error. Please try again later.');
          break;
          
        default:
          toast.error(data.message || 'An error occurred');
      }
      
      return Promise.reject({
        status,
        message: data.message || 'Request failed',
        data: data.data || null,
        errors: data.errors || null
      });
      
    } else if (request) {
      // Network error
      // Network error handled
      toast.error('Network error. Please check your connection.');
      return Promise.reject({
        status: 0,
        message: 'Network error',
        data: null
      });
      
    } else {
      // Request setup error
      // Request setup error handled
      toast.error('Request configuration error');
      return Promise.reject({
        status: 0,
        message: 'Request configuration error',
        data: null
      });
    }
  }
);

// API service methods
class ApiService {
  // Generic GET request
  async get(url, config = {}) {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generic POST request
  async post(url, data = {}, config = {}) {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generic PUT request
  async put(url, data = {}, config = {}) {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generic PATCH request
  async patch(url, data = {}, config = {}) {
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generic DELETE request
  async delete(url, config = {}) {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // File upload request
  async upload(url, formData, config = {}) {
    try {
      const response = await api.post(url, formData, {
        ...config,
        headers: {
          ...config.headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Download file
  async download(url, filename, config = {}) {
    try {
      const response = await api.get(url, {
        ...config,
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      return { success: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Handle errors consistently
  handleError(error) {
    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message || 'Request failed',
        status: error.response.status,
        data: error.response.data?.data || null,
        errors: error.response.data?.errors || null
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        status: 0,
        data: null
      };
    } else {
      return {
        success: false,
        message: error.message || 'Unknown error occurred',
        status: 0,
        data: null
      };
    }
  }

  // Set auth token
  setAuthToken(token) {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('authToken', token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('authToken');
    }
  }

  // Get auth token
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  // Clear auth token
  clearAuthToken() {
    this.setAuthToken(null);
  }

  // Cancel all requests
  cancelAllRequests() {
    // Note: In a real implementation, you'd want to track and cancel ongoing requests
    // Cancelling all pending requests
  }
}

// Create singleton instance
const apiService = new ApiService();

// Export both the instance and the axios instance for direct use
export { api };
export default apiService;
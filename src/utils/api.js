/**
 * API utility for making authenticated requests
 * Automatically attaches JWT token from sessionStorage
 * Handles 401 responses by clearing session and redirecting to login
 */

const API_BASE = '';

/**
 * Get auth token from sessionStorage
 */
export const getAuthToken = () => {
  return sessionStorage.getItem('authToken');
};

/**
 * Clear all auth data from sessionStorage
 */
export const clearAuthData = () => {
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('userData');
  sessionStorage.removeItem('currentUser');
  sessionStorage.removeItem('loginTime');
};

/**
 * Handle 401 unauthorized response
 */
const handleUnauthorized = () => {
  clearAuthData();
  // Redirect to login page
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

/**
 * Make an authenticated fetch request
 * @param {string} endpoint - API endpoint (e.g., '/api/profile/123')
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} Fetch response
 */
export const authFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  // Handle 401 - token expired or invalid
  if (response.status === 401) {
    handleUnauthorized();
  }

  return response;
};

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (endpoint) => authFetch(endpoint, { method: 'GET' }),

  post: (endpoint, data) => authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  put: (endpoint, data) => authFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  delete: (endpoint) => authFetch(endpoint, { method: 'DELETE' }),

  // For multipart/form-data (file uploads)
  postForm: (endpoint, formData) => {
    const token = getAuthToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData - browser sets it with boundary
    return authFetch(endpoint, {
      method: 'POST',
      headers,
      body: formData
    });
  }
};

export default api;
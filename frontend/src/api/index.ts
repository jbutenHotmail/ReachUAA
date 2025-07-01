// Base API URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Function to handle token refresh
export const refreshAccessToken = async (): Promise<string> => {
  try {
    // The refresh token is automatically sent in the cookie
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Include credentials to send cookies
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  } catch (error) {
    // Clear tokens on refresh failure
    localStorage.removeItem('accessToken');
    throw error;
  }
};

// Main API request function with token handling
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  // Get access token from storage
  const accessToken = localStorage.getItem('accessToken');
  
  // Prepare headers
  const headers = new Headers(options.headers);
  
  // Set default content type if not provided
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Add authorization header if token exists
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  
  // Prepare request options
  const requestOptions: RequestInit = {
    ...options,
    headers,
    // Always include credentials to send cookies with every request
    credentials: 'include',
  };
  
  try {
    // Make the request
    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);
    
    // Handle 401 Unauthorized (token expired)
    if (response.status === 401 || response.status === 403) {
      try {
        // Try to refresh the token
        const newToken = await refreshAccessToken();
        
        // Update authorization header with new token
        headers.set('Authorization', `Bearer ${newToken}`);
        
        // Retry the request with new token
        return apiRequest<T>(endpoint, {
          ...options,
          headers,
          credentials: 'include',
        });
      } catch (refreshError) {
        // If refresh fails, throw error (will be handled by caller)
        throw refreshError;
      }
    }
    
    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Handle error responses
    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.message || 'An error occurred',
        data
      );
    }
    
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      500,
      error instanceof Error ? error.message : 'Unknown error',
      error
    );
  }
};

// Define a custom interface for options that includes params
interface ApiRequestOptions extends Omit<RequestInit, 'method'> {
  params?: Record<string, string | number | boolean | undefined>;
}

// Update the api object
export const api = {
  get: <T>(endpoint: string, options?: ApiRequestOptions) => {
    // Append query parameters if params exists
    let url = endpoint;
    if (options?.params) {
      const queryString = new URLSearchParams(
        Object.entries(options.params)
          .filter(([_, value]) => value != null) // Remove undefined/null values
          .map(([key, value]) => [key, String(value)]) // Convert values to strings
      ).toString();
      url = queryString ? `${endpoint}?${queryString}` : endpoint;
    }
    return apiRequest<T>(url, { ...options, method: 'GET' });
  },

  post: <T>(endpoint: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>) => 
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),

  put: <T>(endpoint: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>) => 
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),

  patch: <T>(endpoint: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>) => 
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: data ? JSON.stringify(data) : undefined 
    }),

  delete: <T>(endpoint: string, options?: Omit<RequestInit, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
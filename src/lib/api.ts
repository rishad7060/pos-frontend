// API client utility for frontend-backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      (headers as any).Authorization = `Bearer ${token}`;
    }

    // PERFORMANCE FIX: Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response has content
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text || 'An error occurred' };
        }
      }

      if (!response.ok) {
        // Handle 401 Unauthorized (Expired/Invalid Token)
        if (response.status === 401 && typeof window !== 'undefined') {
          console.warn('Session expired or token invalid. Redirecting to login...');

          // Clear all auth storage
          localStorage.removeItem('authToken');
          localStorage.removeItem('pos_user');
          document.cookie = 'authToken=; path=/; max-age=0;';

          // Notify app components (e.g. POSPage) to perform async cleanup (IndexedDB)
          window.dispatchEvent(new CustomEvent('auth:session-expired'));

          // Prevent redirect loops if already on auth pages
          const currentPath = window.location.pathname;
          const isAuthPage = currentPath.startsWith('/auth/') || currentPath === '/login';

          if (!isAuthPage) {
            const isPosContext = currentPath.startsWith('/pos');

            if (isPosContext) {
              // For POS, wait briefly for event listeners to handle cleanup (IndexedDB) then reload
              // Fallback reload if listener doesn't trigger
              setTimeout(() => {
                window.location.href = '/pos';
              }, 500);
            } else {
              // For Admin/Other, immediate redirect to login
              window.location.href = '/login';
            }

            return {
              error: {
                code: 'SESSION_EXPIRED',
                message: 'Session expired. Redirecting...',
              }
            };
          }
        }

        return {
          error: {
            code: data.code || 'UNKNOWN_ERROR',
            message: data.error || data.message || 'An error occurred',
            details: data.details,
          },
        };
      }

      return { data };
    } catch (error: any) {
      clearTimeout(timeoutId);

      // PERFORMANCE FIX: Handle timeout errors specifically
      if (error.name === 'AbortError') {
        console.error('API request timed out:', endpoint);
        return {
          error: {
            code: 'TIMEOUT_ERROR',
            message: 'Request timed out. The server is taking too long to respond. Please try again.',
          },
        };
      }

      console.error('API request failed:', error);
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Network request failed. Please check if the backend server is running.',
        },
      };
    }
  }

  // Authentication methods
  async login(credentials: { email: string; password: string }) {
    const result = await this.request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (result.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('authToken', result.data.token);
    }

    return result;
  }

  async register(userData: { email: string; password: string; fullName: string; role: string }) {
    const result = await this.request<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (result.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('authToken', result.data.token);
    }

    return result;
  }

  async pinLogin(pinData: { pin: string }) {
    const result = await this.request<{ user: any; token: string }>('/api/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify(pinData),
    });

    if (result.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('authToken', result.data.token);
      // Also store in cookie for Next.js API proxy to access
      document.cookie = `authToken=${result.data.token}; path=/; max-age=86400; SameSite=Lax`; // 24 hours
    }

    return result;
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  // Orders API
  async getOrders(params?: {
    id?: string;
    orderNumber?: string;
    cashierId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/orders${queryString ? `?${queryString}` : ''}`;

    return this.request<any>(endpoint);
  }

  async createOrder(orderData: any) {
    return this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  // Products API
  async getProducts(params?: { isActive?: boolean; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/products${queryString ? `?${queryString}` : ''}`;

    return this.request<any[]>(endpoint);
  }

  // Generic request method for other endpoints
  async get<T = any>(endpoint: string, params?: Record<string, any>) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const fullEndpoint = `${endpoint}${queryString ? `?${queryString}` : ''}`;

    return this.request<T>(fullEndpoint);
  }

  async post<T = any>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T = any>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T = any>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Export individual methods for convenience
export const api = {
  login: apiClient.login.bind(apiClient),
  register: apiClient.register.bind(apiClient),
  pinLogin: apiClient.pinLogin.bind(apiClient),
  logout: apiClient.logout.bind(apiClient),
  getOrders: apiClient.getOrders.bind(apiClient),
  createOrder: apiClient.createOrder.bind(apiClient),
  getProducts: apiClient.getProducts.bind(apiClient),
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
};



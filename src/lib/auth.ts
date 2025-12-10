// Authentication utilities and context
import { api } from './api';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'admin' | 'cashier' | 'manager';
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

// Store user and token in localStorage and cookie
export const setAuthUser = (user: User | null, token: string | null = null) => {
  if (typeof window !== 'undefined') {
    if (user && token) {
      localStorage.setItem('pos_user', JSON.stringify(user));
      localStorage.setItem('authToken', token);

      // Also set as cookie for API proxy to access
      document.cookie = `authToken=${token}; path=/; max-age=86400; SameSite=Lax`; // 24 hours
    } else {
      localStorage.removeItem('pos_user');
      localStorage.removeItem('authToken');

      // Remove cookie
      document.cookie = 'authToken=; path=/; max-age=0';
    }
  }
};

// Get user from localStorage
export const getAuthUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('pos_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
};

// Login function
export const login = async (email: string, password: string): Promise<{ user: User | null; error?: string }> => {
  try {
    const result = await api.login({ email, password });

    if (result.error) {
      return { user: null, error: result.error.message };
    }

    if (result.data && result.data.user && result.data.token) {
      setAuthUser(result.data.user, result.data.token);
      return { user: result.data.user };
    }

    return { user: null, error: 'Login failed: Invalid response from server' };
  } catch (error) {
    console.error('Login error:', error);
    return { user: null, error: 'Network error. Please try again.' };
  }
};

// Register function
export const register = async (
  email: string,
  password: string,
  fullName: string,
  role: 'admin' | 'cashier' | 'manager' = 'cashier'
): Promise<{ user: User | null; error?: string }> => {
  try {
    const result = await api.register({ email, password, fullName, role });

    if (result.error) {
      return { user: null, error: result.error.message };
    }

    if (result.data && result.data.user && result.data.token) {
      setAuthUser(result.data.user, result.data.token);
      return { user: result.data.user };
    }

    return { user: null, error: 'Registration failed: Invalid response from server' };
  } catch (error) {
    console.error('Registration error:', error);
    return { user: null, error: 'Network error. Please try again.' };
  }
};

// PIN login function
export const pinLogin = async (pin: string): Promise<{ user: User | null; error?: string }> => {
  try {
    console.log('🔐 Starting PIN login with PIN:', pin);
    const result = await api.pinLogin({ pin });
    console.log('🔐 PIN login API result:', result);

    if (result.error) {
      return { user: null, error: result.error.message };
    }

    if (result.data && result.data.user && result.data.token) {
      console.log('🔐 PIN login successful - User:', result.data.user, 'ID:', result.data.user.id);
      setAuthUser(result.data.user, result.data.token);
      return { user: result.data.user };
    }

    return { user: null, error: 'PIN login failed: Invalid response from server' };
  } catch (error) {
    console.error('PIN login error:', error);
    return { user: null, error: 'Network error. Please try again.' };
  }
};

// Logout function
export const logout = async () => {
  try {
    // Record logout in backend (don't wait for it to avoid blocking logout)
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    }).catch(error => {
      console.error('Failed to record logout:', error);
    });
  } catch (error) {
    console.error('Logout recording failed:', error);
  }

  // Clear auth state
  setAuthUser(null);
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  const user = getAuthUser();
  const token = localStorage.getItem('authToken');
  return user !== null && token !== null;
};

// Check if user has specific role
export const hasRole = (role: 'admin' | 'cashier' | 'manager'): boolean => {
  const user = getAuthUser();
  return user?.role === role;
};
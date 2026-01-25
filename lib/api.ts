// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Token management
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
};

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Auth API
export const authApi = {
  register: async (email: string, password: string, fullName?: string) => {
    const data = await apiRequest<{
      message: string;
      user: { id: string; email: string; fullName: string };
      token: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    setToken(data.token);
    return data;
  },

  login: async (email: string, password: string) => {
    const data = await apiRequest<{
      message: string;
      user: { id: string; email: string; fullName: string };
      token: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data;
  },

  logout: () => {
    removeToken();
  },

  isAuthenticated: () => {
    return !!getToken();
  },
};

// Dashboard API
export interface DashboardData {
  id: string;
  title: string;
  description?: string;
  promptUsed?: string;
  configuration: {
    dataSources?: Array<{
      id: string;
      name: string;
      schema: unknown;
      // Data is stored separately or fetched on demand
    }>;
    relations?: Array<{
      id: string;
      sourceId: string;
      targetId: string;
      sourceColumn: string;
      targetColumn: string;
    }>;
    pages?: Array<{
      id: string;
      name: string;
      charts: unknown[];
    }>;
  };
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export const dashboardApi = {
  list: async (): Promise<DashboardData[]> => {
    return apiRequest<DashboardData[]>('/api/dashboards');
  },

  get: async (id: string): Promise<DashboardData> => {
    return apiRequest<DashboardData>(`/api/dashboards/${id}`);
  },

  create: async (data: {
    title: string;
    description?: string;
    promptUsed?: string;
    configuration?: unknown;
  }): Promise<DashboardData> => {
    return apiRequest<DashboardData>('/api/dashboards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      configuration?: unknown;
      isPublic?: boolean;
    }
  ): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/api/dashboards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/api/dashboards/${id}`, {
      method: 'DELETE',
    });
  },
};

// User API
export const userApi = {
  getProfile: async () => {
    return apiRequest<{
      id: string;
      email: string;
      fullName: string;
      createdAt: string;
      lastLogin: string;
      preferences: unknown;
    }>('/api/users/profile');
  },

  updateProfile: async (data: { fullName?: string }) => {
    return apiRequest<{ message: string; user: unknown }>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

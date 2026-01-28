import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, ROLE_PERMISSIONS, RolePermissions } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: RolePermissions | null;
  login: (matricule: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, matricule: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('fiara_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem('fiara_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (matricule: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      // NOTE: Keeping the payload key as 'email' for backend compatibility if it hasn't been updated yet.
      // If backend expects 'matricule', change key to 'matricule'.
      // Based on user request "on utilise une matricule sur la place de email", effectively mapping matricule to email field is safest start.
      // However, for clarity in frontend code, we use 'matricule' variable name.
      const response = await apiClient.post<any>('/auth/login', { email: matricule, password });

      if (response.data && response.data.user && response.data.token) {
        const { user, token } = response.data;

        // Handle pending status
        if (user.status === 'pending') {
          // We don't log them in fully, or we do but redirect them.
          // Let's set user state but frontend router will handle redirect.
        }

        const authenticatedUser = {
          ...user,
          token,
          lastLogin: new Date().toISOString(),
        };

        setUser(authenticatedUser);
        apiClient.setAuthToken(token);
        localStorage.setItem('fiara_user', JSON.stringify(authenticatedUser));

        setIsLoading(false);
        return { success: true };
      }

      return { success: false, error: 'Réponse inattendue du serveur' };
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Erreur de connexion. Veuillez réessayer.';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      apiClient.clearAuthToken();
      localStorage.removeItem('fiara_user');
    }
  };

  const register = async (name: string, matricule: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // Mapping matricule to email (identifier) and email to profile_email (contact)
      // Role defaults to 'collaborator' in backend
      await apiClient.post('/auth/register', { name, email: matricule, password, profile_email: email });
      return { success: true };
    } catch (error: any) {
      console.error('Register error:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de l\'inscription';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = (role: UserRole) => {
    if (user) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem('fiara_user', JSON.stringify(updatedUser));
    }
  };

  const permissions = user ? ROLE_PERMISSIONS[user.role] : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        permissions,
        login,
        register,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

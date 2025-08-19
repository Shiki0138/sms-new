import { useState, useEffect, createContext, useContext } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  subscription_plan: 'light' | 'standard' | 'premium';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasFeatureAccess: (feature: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Feature to minimum plan mapping
const FEATURE_PLAN_REQUIREMENTS: Record<string, 'light' | 'standard' | 'premium'> = {
  // Light plan features
  'basic_booking': 'light',
  'customer_management': 'light',
  'basic_messaging': 'light',
  'basic_analytics': 'light',
  
  // Standard plan features
  'smart_upselling': 'standard',
  'membership_management': 'standard',
  'referral_tracking': 'standard',
  'inventory_management': 'standard',
  
  // Premium plan features
  'advanced_analytics': 'premium',
  'api_access': 'premium',
  'white_label': 'premium',
  'priority_support': 'premium'
};

const PLAN_HIERARCHY = {
  light: 1,
  standard: 2,
  premium: 3
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  const hasFeatureAccess = (feature: string): boolean => {
    if (!user) return false;
    
    const requiredPlan = FEATURE_PLAN_REQUIREMENTS[feature];
    if (!requiredPlan) return true; // Feature has no plan restrictions
    
    const userPlanLevel = PLAN_HIERARCHY[user.subscription_plan || 'light'];
    const requiredPlanLevel = PLAN_HIERARCHY[requiredPlan];
    
    return userPlanLevel >= requiredPlanLevel;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasFeatureAccess
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
import { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('medisync_token'),
  isAuthenticated: false,
  loading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('medisync_token');
      const savedUser = localStorage.getItem('medisync_user');
      
      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await authAPI.getProfile();
          const userData = response.data.data?.user || response.data.user;
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: userData,
              token: token,
            },
          });
        } catch (error) {
          // Token is invalid, clear storage
          localStorage.removeItem('medisync_token');
          localStorage.removeItem('medisync_user');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authAPI.login(credentials);
      
      // Handle the nested data structure from backend
      const { user, token } = response.data.data || response.data;
      
      if (!user || !token) {
        throw new Error('Invalid response from server');
      }
      
      // Save to localStorage
      localStorage.setItem('medisync_token', token);
      localStorage.setItem('medisync_user', JSON.stringify(user));
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
      
      toast.success(`Welcome back, ${user.name}!`);
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      
      // Handle different types of errors
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.message === 'Network Error') {
        toast.error('Unable to connect to server. Please check your connection.');
      } else {
        toast.error('Login failed. Please try again.');
      }
      
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await authAPI.register(userData);
      
      // Handle the nested data structure from backend
      const { user, token } = response.data.data || response.data;
      
      // Save to localStorage
      localStorage.setItem('medisync_token', token);
      localStorage.setItem('medisync_user', JSON.stringify(user));
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
      
      toast.success(`Welcome to MediSync, ${user.name}!`);
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('medisync_token');
    localStorage.removeItem('medisync_user');
    // Clear socket notification log on logout
    sessionStorage.removeItem('socket_disabled_logged');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  const updateUser = (userData) => {
    localStorage.setItem('medisync_user', JSON.stringify(userData));
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const getRoleDashboard = (role) => {
    switch (role) {
      case 'admin':
        return '/admin-dashboard';
      case 'doctor':
        return '/doctor-dashboard';
      case 'user':
      default:
        return '/dashboard';
    }
  };

  const value = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    updateUser,
    getRoleDashboard,
  }), [state]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
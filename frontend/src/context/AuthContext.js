import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  AUTH_START: 'AUTH_START',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_CLEAR_ERROR: 'AUTH_CLEAR_ERROR',
  AUTH_UPDATE_USER: 'AUTH_UPDATE_USER'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.AUTH_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AUTH_ACTIONS.AUTH_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.AUTH_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error
      };

    case AUTH_ACTIONS.AUTH_LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.AUTH_CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.AUTH_UPDATE_USER:
      return {
        ...state,
        user: action.payload.user
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          // Verify token with backend
          const response = await authService.verifyToken();
          if (response.success) {
            dispatch({
              type: AUTH_ACTIONS.AUTH_SUCCESS,
              payload: {
                user: response.data.user,
                token
              }
            });
          } else {
            // Invalid token, remove from storage
            localStorage.removeItem('authToken');
            dispatch({
              type: AUTH_ACTIONS.AUTH_FAILURE,
              payload: { error: 'Invalid token' }
            });
          }
        } else {
          dispatch({
            type: AUTH_ACTIONS.AUTH_FAILURE,
            payload: { error: null }
          });
        }
      } catch (error) {
        // Auth initialization error handled internally
        localStorage.removeItem('authToken');
        dispatch({
          type: AUTH_ACTIONS.AUTH_FAILURE,
          payload: { error: 'Authentication failed' }
        });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.AUTH_START });
      
      const response = await authService.login(email, password);
      
      if (response.success) {
        const { user, token } = response.data;
        
        // Store token in localStorage
        localStorage.setItem('authToken', token);
        
        dispatch({
          type: AUTH_ACTIONS.AUTH_SUCCESS,
          payload: { user, token }
        });
        
        return { success: true };
      } else {
        dispatch({
          type: AUTH_ACTIONS.AUTH_FAILURE,
          payload: { error: response.message }
        });
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({
        type: AUTH_ACTIONS.AUTH_FAILURE,
        payload: { error: errorMessage }
      });
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.AUTH_START });
      
      const response = await authService.register(userData);
      
      if (response.success) {
        const { user, token } = response.data;
        
        // Store token in localStorage
        localStorage.setItem('authToken', token);
        
        dispatch({
          type: AUTH_ACTIONS.AUTH_SUCCESS,
          payload: { user, token }
        });
        
        return { success: true };
      } else {
        dispatch({
          type: AUTH_ACTIONS.AUTH_FAILURE,
          payload: { error: response.message }
        });
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({
        type: AUTH_ACTIONS.AUTH_FAILURE,
        payload: { error: errorMessage }
      });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('authToken');
    dispatch({ type: AUTH_ACTIONS.AUTH_LOGOUT });
  };

  // Update user profile
  const updateUser = async (userData) => {
    try {
      const response = await authService.updateProfile(userData);
      
      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.AUTH_UPDATE_USER,
          payload: { user: response.data.user }
        });
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      
      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      return { success: false, error: errorMessage };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.AUTH_CLEAR_ERROR });
  };

  // Context value
  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    changePassword,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
import apiService from './apiService';

class AuthService {
  // Register new user
  async register(userData) {
    try {
      const response = await apiService.post('/auth/register', userData);
      
      if (response.success && response.data.token) {
        apiService.setAuthToken(response.data.token);
      }
      
      return response;
    } catch (error) {
      // Registration error handled internally
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      const response = await apiService.post('/auth/login', {
        email,
        password
      });
      
      if (response.success && response.data.token) {
        apiService.setAuthToken(response.data.token);
      }
      
      return response;
    } catch (error) {
      // Login error handled internally
      throw error;
    }
  }

  // Logout user
  logout() {
    apiService.clearAuthToken();
    
    // Clear other stored user data
    localStorage.removeItem('userPreferences');
    localStorage.removeItem('walletConnected');
    
    // Redirect to login page
    window.location.href = '/login';
  }

  // Verify token validity
  async verifyToken() {
    try {
      const token = apiService.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: 'No token found'
        };
      }

      const response = await apiService.get('/auth/verify-token');
      return response;
    } catch (error) {
      console.error('Token verification error:', error);
      
      // If token is invalid, clear it
      apiService.clearAuthToken();
      
      return {
        success: false,
        message: 'Token verification failed'
      };
    }
  }

  // Get user profile
  async getProfile() {
    try {
      const response = await apiService.get('/auth/profile');
      return response;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userData) {
    try {
      const response = await apiService.put('/auth/profile', userData);
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await apiService.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = apiService.getAuthToken();
    if (!token) return false;

    try {
      // Check if token is expired (basic JWT check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  // Get current user data from token
  getCurrentUser() {
    const token = apiService.getAuthToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        userId: payload.userId,
        exp: payload.exp,
        iat: payload.iat
      };
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }

  // Reset password (request)
  async requestPasswordReset(email) {
    try {
      const response = await apiService.post('/auth/forgot-password', { email });
      return response;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  // Reset password (confirm with token)
  async resetPassword(token, newPassword) {
    try {
      const response = await apiService.post('/auth/reset-password', {
        token,
        password: newPassword
      });
      return response;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  // Verify email
  async verifyEmail(token) {
    try {
      const response = await apiService.post('/auth/verify-email', { token });
      return response;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  // Resend verification email
  async resendVerificationEmail() {
    try {
      const response = await apiService.post('/auth/resend-verification');
      return response;
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }

  // Enable two-factor authentication
  async enableTwoFactor() {
    try {
      const response = await apiService.post('/auth/enable-2fa');
      return response;
    } catch (error) {
      console.error('Enable 2FA error:', error);
      throw error;
    }
  }

  // Verify two-factor authentication
  async verifyTwoFactor(token) {
    try {
      const response = await apiService.post('/auth/verify-2fa', { token });
      return response;
    } catch (error) {
      console.error('Verify 2FA error:', error);
      throw error;
    }
  }

  // Disable two-factor authentication
  async disableTwoFactor(password) {
    try {
      const response = await apiService.post('/auth/disable-2fa', { password });
      return response;
    } catch (error) {
      console.error('Disable 2FA error:', error);
      throw error;
    }
  }

  // Get user sessions
  async getUserSessions() {
    try {
      const response = await apiService.get('/auth/sessions');
      return response;
    } catch (error) {
      console.error('Get sessions error:', error);
      throw error;
    }
  }

  // Revoke session
  async revokeSession(sessionId) {
    try {
      const response = await apiService.delete(`/auth/sessions/${sessionId}`);
      return response;
    } catch (error) {
      console.error('Revoke session error:', error);
      throw error;
    }
  }

  // Revoke all sessions (except current)
  async revokeAllSessions() {
    try {
      const response = await apiService.post('/auth/revoke-all-sessions');
      return response;
    } catch (error) {
      console.error('Revoke all sessions error:', error);
      throw error;
    }
  }

  // Get account security status
  async getSecurityStatus() {
    try {
      const response = await apiService.get('/auth/security-status');
      return response;
    } catch (error) {
      console.error('Get security status error:', error);
      throw error;
    }
  }

  // Update security settings
  async updateSecuritySettings(settings) {
    try {
      const response = await apiService.put('/auth/security-settings', settings);
      return response;
    } catch (error) {
      console.error('Update security settings error:', error);
      throw error;
    }
  }

  // Delete account
  async deleteAccount(password, confirmationText) {
    try {
      const response = await apiService.delete('/auth/account', {
        data: {
          password,
          confirmationText
        }
      });
      
      if (response.success) {
        this.logout();
      }
      
      return response;
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
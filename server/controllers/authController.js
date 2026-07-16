/**
 * Authentication Controller
 * Handles user authentication, registration, and profile management
 */

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const emailService = require('../utils/emailService');
const { addToBlacklist } = require('../utils/tokenBlacklist');

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, phone, language = 'en' } = req.body;

    // Restrict role to user or doctor only (whitelist)
    const role = 'user'; // Always create as regular user; doctors must verify separately

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password, // This will be hashed by the User model
      role,
      phone,
      language,
      lastLogin: new Date()
    });

    await user.save();

    // Doctors must be created through verification process, not registration

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: user.getPublicProfile(),
        expiresIn: process.env.JWT_EXPIRE || '7d'
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      data: {
        token,
        user: user.getPublicProfile(),
        expiresIn: process.env.JWT_EXPIRE || '7d'
      },
      message: 'Login successful'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user profile
 * @route GET /api/auth/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user },
      message: 'Profile retrieved successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @route PUT /api/auth/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, phone, language, preferences } = req.body;
    const userId = req.user.userId;

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (language !== undefined) updateData.language = language;
    if (preferences !== undefined) updateData.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Change user password
 * @route POST /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword; // This will be hashed by the User model
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password - generate OTP
 * @route POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      // For security, don't reveal if email exists
      return res.status(400).json({
        success: false,
        message: 'If an account exists with this email, we\'ll send a password reset code'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This account is deactivated. Please contact support.'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to user record
    user.resetPasswordOTP = otp;
    user.resetPasswordExpire = otpExpiry;
    await user.save();

    // Send OTP email (fire-and-forget - don't block the response)
    emailService.sendPasswordResetOTP(email, otp, user.name)
      .catch(() => {
        // Silently fail - OTP is already saved in database
      });

    // Response - don't reveal OTP in API response
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset code has been sent. Please check your inbox and spam folder.'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using OTP
 * @route POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate inputs
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please enter the 6-digit code.'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or OTP'
      });
    }

    // Verify OTP exists and hasn't expired
    if (!user.resetPasswordOTP) {
      return res.status(400).json({
        success: false,
        message: 'No password reset request found. Please request a new code.'
      });
    }

    // Check OTP expiry
    if (new Date() > user.resetPasswordExpire) {
      user.resetPasswordOTP = null;
      user.resetPasswordExpire = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'Password reset code has expired. Please request a new one.'
      });
    }

    // Verify OTP matches
    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check and try again.'
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.resetPasswordOTP = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({
      success: true,
      message: 'Your password has been reset successfully. Please login with your new password.'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (invalidate token)
 * @route POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      // Calculate remaining token expiration time
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const expiresIn = (decoded.exp * 1000) - Date.now();
        if (expiresIn > 0) {
          // Add token to blacklist with expiration
          addToBlacklist(token, expiresIn);
        }
      }
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
};

/**
 * Verify JWT token
 * @route GET /api/auth/verify
 */
const verifyToken = async (req, res) => {
  // If we reach here, the token is valid (verified by middleware)
  res.json({
    success: true,
    data: {
      userId: req.user.userId,
      valid: true
    },
    message: 'Token is valid'
  });
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  verifyToken
};
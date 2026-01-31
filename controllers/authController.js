const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/tokenUtils');
const { encrypt } = require('../utils/cryptoUtils');
const { validationResult } = require('express-validator');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
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

        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        // Create new user
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            role: role || 'citizen'
        });

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user._id);

        // Save refresh token to user
        user.refreshToken = refreshToken;
        await user.save();

        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful! Welcome to CivicConnect.',
            data: {
                user: user.getPublicProfile(),
                accessToken
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user and include password for comparison
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user._id);

        // Update user's refresh token and last login
        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save();

        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            message: `Welcome back, ${user.name}!`,
            data: {
                user: user.getPublicProfile(),
                accessToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
    try {
        // Clear refresh token from user
        if (req.user) {
            req.user.refreshToken = null;
            await req.user.save();
        }

        // Clear cookies
        res.cookie('refreshToken', '', {
            httpOnly: true,
            expires: new Date(0)
        });

        res.status(200).json({
            success: true,
            message: 'Logged out successfully.'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed.'
        });
    }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        res.status(200).json({
            success: true,
            data: { user: user.getPublicProfile() }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile.'
        });
    }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public (with refresh token)
 */
const refreshToken = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token not found.'
            });
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token.'
            });
        }

        // Find user with matching refresh token
        const user = await User.findById(decoded.userId).select('+refreshToken');

        if (!user || user.refreshToken !== token) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token.'
            });
        }

        // Generate new tokens
        const tokens = generateTokens(user._id);

        // Update refresh token
        user.refreshToken = tokens.refreshToken;
        await user.save();

        // Set new refresh token cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            data: { accessToken: tokens.accessToken }
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh token.'
        });
    }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
    try {
        const { name, avatar } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        if (name) user.name = name;
        if (avatar) user.avatar = avatar;
        if (req.body.aadharNumber !== undefined) user.aadharNumber = encrypt(req.body.aadharNumber);
        if (req.body.panNumber !== undefined) user.panNumber = encrypt(req.body.panNumber);
        if (req.body.phoneNumber !== undefined) user.phoneNumber = req.body.phoneNumber;
        if (req.body.address !== undefined) user.address = req.body.address;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            data: { user: user.getPublicProfile() }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile.'
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    getProfile,
    refreshToken,
    updateProfile
};

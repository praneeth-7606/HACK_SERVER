const jwt = require('jsonwebtoken');

/**
 * Generate Access Token (short-lived)
 */
const generateAccessToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
    );
};

/**
 * Generate Refresh Token (long-lived)
 */
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
    );
};

/**
 * Verify Access Token
 */
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Verify Refresh Token
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Generate both tokens
 */
const generateTokens = (userId) => {
    return {
        accessToken: generateAccessToken(userId),
        refreshToken: generateRefreshToken(userId)
    };
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokens
};

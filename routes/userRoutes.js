const express = require('express');
const {
    getAllUsers,
    getUserById,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    getUserStats,
    getLeaderboard
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');

const router = express.Router();

// Public routes
router.get('/leaderboard', getLeaderboard);

// All following routes require authentication and admin role
router.use(protect, adminOnly);

// User management routes
router.get('/stats', getUserStats);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id/status', updateUserStatus);
router.patch('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

module.exports = router;

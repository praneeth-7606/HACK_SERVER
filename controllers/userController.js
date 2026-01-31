const User = require('../models/User');
const Concern = require('../models/Concern');

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, role, search } = req.query;

        // Build query
        const query = {};

        if (role && ['citizen', 'admin'].includes(role)) {
            query.role = role;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    hasMore: page * limit < total
                }
            }
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users.'
        });
    }
};

/**
 * @desc    Get user by ID (Admin only)
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        res.status(200).json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user.'
        });
    }
};

/**
 * @desc    Update user status (Admin only)
 * @route   PATCH /api/users/:id/status
 * @access  Private/Admin
 */
const updateUserStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Prevent admin from deactivating themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot change your own status.'
            });
        }

        user.isActive = isActive;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User has been ${isActive ? 'activated' : 'deactivated'}.`,
            data: { user }
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user status.'
        });
    }
};

/**
 * @desc    Update user role (Admin only)
 * @route   PATCH /api/users/:id/role
 * @access  Private/Admin
 */
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['citizen', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be either citizen or admin.'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Prevent admin from changing their own role
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot change your own role.'
            });
        }

        user.role = role;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User role updated to ${role}.`,
            data: { user }
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user role.'
        });
    }
};

/**
 * @desc    Delete user (Admin only)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Prevent admin from deleting themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account from here.'
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully.'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user.'
        });
    }
};

/**
 * @desc    Get user statistics (Admin only)
 * @route   GET /api/users/stats
 * @access  Private/Admin
 */
const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalCitizens = await User.countDocuments({ role: 'citizen' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const activeUsers = await User.countDocuments({ isActive: true });
        const inactiveUsers = await User.countDocuments({ isActive: false });

        // Get users registered in last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const newUsersThisWeek = await User.countDocuments({
            createdAt: { $gte: weekAgo }
        });

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    totalCitizens,
                    totalAdmins,
                    activeUsers,
                    inactiveUsers,
                    newUsersThisWeek
                }
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user statistics.'
        });
    }
};

/**
 * @desc    Get top citizens leaderboard
 * @route   GET /api/users/leaderboard
 * @access  Public
 */
const getLeaderboard = async (req, res) => {
    try {
        const leaderboard = await Concern.aggregate([
            {
                $group: {
                    _id: '$createdBy',
                    reportCount: { $sum: 1 },
                    resolvedCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
                    }
                }
            },
            { $sort: { reportCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 1,
                    reportCount: 1,
                    resolvedCount: 1,
                    name: '$user.name',
                    avatar: '$user.avatar'
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leaderboard'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    getUserStats,
    getLeaderboard
};

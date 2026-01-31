const Notification = require('../models/Notification');

/**
 * @desc    Get current user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            count: notifications.length,
            data: notifications
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
};

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
    try {
        console.log(`Mark Read Request - ID: ${req.params.id}, User: ${req.user._id}`);
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            console.log(`Notification ${req.params.id} not found or recipient mismatch for user ${req.user._id}`);
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        console.log(`Notification ${req.params.id} marked as read`);
        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification'
        });
    }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
    try {
        console.log(`Mark All Read Request - User: ${req.user._id}`);
        const result = await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );

        console.log(`Marked ${result.modifiedCount} notifications as read for user ${req.user._id}`);
        res.status(200).json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notifications'
        });
    }
};

module.exports = {
    getMyNotifications,
    markAsRead,
    markAllAsRead
};

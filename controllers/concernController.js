const Concern = require('../models/Concern');
const Policy = require('../models/Policy');
const Notification = require('../models/Notification');
const fs = require('fs');
const path = require('path');

// Helper to delete file
const deleteFile = (filePath) => {
    if (filePath) {
        // Handle both absolute paths and relative URL paths
        let absolutePath = filePath;
        if (filePath.startsWith('/uploads')) {
            absolutePath = path.join(__dirname, '..', filePath);
        }

        if (fs.existsSync(absolutePath)) {
            fs.unlink(absolutePath, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
    }
};

/**
 * @desc    Create a new concern
 * @route   POST /api/concerns
 * @access  Private (Citizen)
 */
const createConcern = async (req, res) => {
    try {
        const { title, description, category, location, lat, lng } = req.body;

        let imageUrl = null;
        if (req.file) {
            // Store relative path from uploads directory
            imageUrl = `/uploads/concerns/${req.file.filename}`;
        }

        const concern = await Concern.create({
            title,
            description,
            category,
            location,
            coordinates: {
                lat: lat ? parseFloat(lat) : null,
                lng: lng ? parseFloat(lng) : null
            },
            imageUrl,
            createdBy: req.user._id
        });

        // Populate creator info before sending response
        await concern.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            data: concern
        });
    } catch (error) {
        // If error, delete uploaded file if it exists
        if (req.file) {
            deleteFile(path.join(__dirname, '../uploads/concerns', req.file.filename));
        }
        console.error('Create concern error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit concern',
            error: error.message
        });
    }
};

/**
 * @desc    Get all concerns (with filters)
 * @route   GET /api/concerns
 * @access  Public
 */
const getAllConcerns = async (req, res) => {
    try {
        const { status, category, page = 1, limit = 10 } = req.query;

        const query = {};

        if (status && status !== 'All') {
            query.status = status;
        }

        if (category && category !== 'All') {
            query.category = category;
        }

        // Pagination
        const skip = (page - 1) * limit;

        const concerns = await Concern.find(query)
            .populate('createdBy', 'name email')
            .populate('upvotes', '_id') // Populate upvotes to get IDs
            .populate('comments.user', 'name avatar') // Populate comment users
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Concern.countDocuments(query);

        res.status(200).json({
            success: true,
            count: concerns.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: concerns
        });
    } catch (error) {
        console.error('Get concerns error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch concerns'
        });
    }
};

/**
 * @desc    Get concerns created by current user
 * @route   GET /api/concerns/my
 * @access  Private
 */
const getMyConcerns = async (req, res) => {
    try {
        const concerns = await Concern.find({ createdBy: req.user._id })
            .populate('upvotes', '_id')
            .populate('comments.user', 'name avatar')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: concerns.length,
            data: concerns
        });
    } catch (error) {
        console.error('Get my concerns error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your concerns'
        });
    }
};

/**
 * @desc    Get single concern by ID
 * @route   GET /api/concerns/:id
 * @access  Public
 */
const getConcernById = async (req, res) => {
    try {
        const concern = await Concern.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('upvotes', '_id')
            .populate('comments.user', 'name avatar');

        if (!concern) {
            return res.status(404).json({
                success: false,
                message: 'Concern not found'
            });
        }

        res.status(200).json({
            success: true,
            data: concern
        });
    } catch (error) {
        console.error('Get concern error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch concern details'
        });
    }
};

/**
 * @desc    Update concern status
 * @route   PUT /api/concerns/:id/status
 * @access  Private (Admin)
 */
const updateConcernStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['Pending', 'In Progress', 'Resolved', 'Rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const concern = await Concern.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!concern) {
            return res.status(404).json({
                success: false,
                message: 'Concern not found'
            });
        }

        // Send notification to the creator
        try {
            await Notification.create({
                recipient: concern.createdBy,
                sender: req.user._id,
                type: 'StatusUpdate',
                concern: concern._id,
                message: `The status of your concern "${concern.title}" has been updated to "${status}".`
            });
        } catch (notificationError) {
            console.error('Failed to create status notification:', notificationError);
        }

        res.status(200).json({
            success: true,
            data: concern
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
};

/**
 * @desc    Delete concern
 * @route   DELETE /api/concerns/:id
 * @access  Private (Admin or Owner)
 */
const deleteConcern = async (req, res) => {
    try {
        const concern = await Concern.findById(req.params.id);

        if (!concern) {
            return res.status(404).json({
                success: false,
                message: 'Concern not found'
            });
        }

        // Check permission: Admin or Owner (only if pending)
        const isOwner = concern.createdBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isAdmin && (!isOwner || concern.status !== 'Pending')) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this concern'
            });
        }

        // Delete image file if exists
        if (concern.imageUrl) {
            deleteFile(concern.imageUrl);
        }

        await concern.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Concern deleted successfully'
        });
    } catch (error) {
        console.error('Delete concern error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete concern'
        });
    }
};

/**
 * @desc    Toggle upvote on a concern
 * @route   PUT /api/concerns/:id/upvote
 * @access  Private
 */
const upvoteConcern = async (req, res) => {
    try {
        const concernId = req.params.id;
        const userId = req.user._id;

        const concern = await Concern.findById(concernId);
        if (!concern) {
            return res.status(404).json({ success: false, message: 'Concern not found' });
        }

        const hasUpvoted = concern.upvotes.includes(userId);
        const update = hasUpvoted
            ? { $pull: { upvotes: userId } }
            : { $addToSet: { upvotes: userId } };

        const updatedConcern = await Concern.findByIdAndUpdate(
            concernId,
            update,
            { new: true }
        ).populate('createdBy', 'name email')
            .populate('upvotes', '_id')
            .populate('comments.user', 'name avatar');

        res.status(200).json({
            success: true,
            data: updatedConcern
        });
    } catch (error) {
        console.error('Upvote error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Add a comment to a concern
 * @route   POST /api/concerns/:id/comments
 * @access  Private
 */
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const concernId = req.params.id;

        if (!text) {
            return res.status(400).json({ success: false, message: 'Comment text is required' });
        }

        const newComment = {
            user: req.user._id,
            text,
            isOfficial: req.user.role === 'admin',
            createdAt: new Date()
        };

        const updatedConcern = await Concern.findByIdAndUpdate(
            concernId,
            { $push: { comments: newComment } },
            { new: true }
        ).populate('comments.user', 'name avatar');

        if (!updatedConcern) {
            return res.status(404).json({ success: false, message: 'Concern not found' });
        }

        // Get the last comment (the one we just added)
        const addedComment = updatedConcern.comments[updatedConcern.comments.length - 1];

        res.status(201).json({
            success: true,
            data: addedComment
        });

        // Send notification to owner (if commenter is not the owner)
        if (updatedConcern.createdBy.toString() !== req.user._id.toString()) {
            try {
                await Notification.create({
                    recipient: updatedConcern.createdBy,
                    sender: req.user._id,
                    type: 'NewComment',
                    concern: updatedConcern._id,
                    message: `${req.user.name} commented on your concern: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
                });
            } catch (notificationError) {
                console.error('Failed to create comment notification:', notificationError);
            }
        }
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Get dashboard statistics for citizen
 * @route   GET /api/concerns/citizen/stats
 * @access  Private
 */
const getCitizenStats = async (req, res) => {
    console.log(`Getting citizen stats for user: ${req.user._id}`);
    try {
        const myConcernsCount = await Concern.countDocuments({ createdBy: req.user._id });
        const inProgressCount = await Concern.countDocuments({
            createdBy: req.user._id,
            status: 'In Progress'
        });
        const resolvedCount = await Concern.countDocuments({
            createdBy: req.user._id,
            status: 'Resolved'
        });

        const unreadNotifications = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        // Get recent community concerns
        const recentConcerns = await Concern.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('createdBy', 'name');

        // Get recent published policies
        const recentPolicies = await Policy.find({ status: 'Published' })
            .sort({ createdAt: -1 })
            .limit(3);

        // Merge and sort activities
        const mergedActivities = [
            ...recentConcerns.map(c => ({
                id: c._id,
                type: 'concern',
                title: c.title,
                status: c.status,
                date: c.createdAt,
                author: c.createdBy?.name || 'Anonymous'
            })),
            ...recentPolicies.map(p => ({
                id: p._id,
                type: 'policy',
                title: p.title,
                status: 'Under Review', // Or 'Published'
                date: p.createdAt,
                author: 'Administration'
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    myConcerns: myConcernsCount,
                    inProgress: inProgressCount,
                    resolved: resolvedCount,
                    unreadNotifications,
                    // We can also add global stats if needed
                    globalResolved: await Concern.countDocuments({ status: 'Resolved' })
                },
                recentActivities: mergedActivities
            }
        });
    } catch (error) {
        console.error('Get citizen stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    createConcern,
    getAllConcerns,
    getMyConcerns,
    getConcernById,
    updateConcernStatus,
    deleteConcern,
    upvoteConcern,
    addComment,
    getCitizenStats
};

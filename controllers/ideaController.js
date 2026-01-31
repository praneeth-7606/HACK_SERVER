const Idea = require('../models/Idea');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

/**
 * @desc    Submit new idea (Citizen)
 * @route   POST /api/ideas
 * @access  Private/Citizen
 */
const submitIdea = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const ideaData = {
            ...req.body,
            submittedBy: req.user._id
        };

        const idea = await Idea.create(ideaData);

        // Notify admins about new idea
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        if (admins.length > 0) {
            const notifications = admins.map(admin => ({
                recipient: admin._id,
                sender: req.user._id,
                type: 'IdeaSubmitted',
                idea: idea._id,
                message: `New idea submitted: "${idea.title}" in ${idea.category} category.`
            }));
            await Notification.insertMany(notifications);
        }

        res.status(201).json({
            success: true,
            message: 'Idea submitted successfully',
            data: { idea }
        });
    } catch (error) {
        console.error('Submit idea error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit idea'
        });
    }
};

/**
 * @desc    Get all ideas with filters
 * @route   GET /api/ideas
 * @access  Public (authenticated)
 */
const getAllIdeas = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            category,
            status,
            search,
            sortBy = 'createdAt',
            order = 'desc',
            myIdeas = false
        } = req.query;

        const query = { isActive: true };

        // Filter by user's own ideas
        if (myIdeas === 'true' && req.user) {
            query.submittedBy = req.user._id;
        }

        // Only show public ideas to non-admins (unless viewing own ideas)
        if (req.user?.role !== 'admin' && myIdeas !== 'true') {
            query.visibility = 'Public';
        }

        if (category && category !== 'All') {
            query.category = category;
        }

        if (status && status !== 'All') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        const sortOptions = {};
        if (sortBy === 'popular') {
            sortOptions.upvoteCount = -1;
        } else if (sortBy === 'trending') {
            sortOptions.viewCount = -1;
        } else {
            sortOptions[sortBy] = order === 'asc' ? 1 : -1;
        }

        const ideas = await Idea.find(query)
            .populate('submittedBy', 'name email avatar')
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Idea.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                ideas,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalIdeas: total,
                    hasMore: page * limit < total
                }
            }
        });
    } catch (error) {
        console.error('Get ideas error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ideas'
        });
    }
};

/**
 * @desc    Get single idea by ID
 * @route   GET /api/ideas/:id
 * @access  Private
 */
const getIdeaById = async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id)
            .populate('submittedBy', 'name email avatar role')
            .populate('collaborators.user', 'name email avatar')
            .populate('governmentResponse.respondedBy', 'name email');

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        // Check visibility permissions
        if (idea.visibility === 'Private' && 
            req.user.role !== 'admin' && 
            idea.submittedBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this idea'
            });
        }

        // Increment view count
        await idea.incrementViews();

        // Check user interactions
        const hasUpvoted = idea.upvotes.includes(req.user._id);
        const hasDownvoted = idea.downvotes.includes(req.user._id);

        res.status(200).json({
            success: true,
            data: {
                idea,
                hasUpvoted,
                hasDownvoted
            }
        });
    } catch (error) {
        console.error('Get idea by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch idea'
        });
    }
};

/**
 * @desc    Update idea
 * @route   PUT /api/ideas/:id
 * @access  Private (Owner or Admin)
 */
const updateIdea = async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id);

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && idea.submittedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this idea'
            });
        }

        // Update allowed fields
        const allowedUpdates = ['title', 'description', 'category', 'subCategory', 'targetArea', 
            'expectedImpact', 'estimatedBudget', 'timeline', 'benefits', 'challenges', 
            'resources', 'tags', 'visibility'];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                idea[field] = req.body[field];
            }
        });

        // Admin-only updates
        if (req.user.role === 'admin') {
            if (req.body.status) idea.status = req.body.status;
            if (req.body.priority) idea.priority = req.body.priority;
            if (req.body.isFeatured !== undefined) idea.isFeatured = req.body.isFeatured;
        }

        await idea.save();

        res.status(200).json({
            success: true,
            message: 'Idea updated successfully',
            data: { idea }
        });
    } catch (error) {
        console.error('Update idea error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update idea'
        });
    }
};

/**
 * @desc    Delete idea
 * @route   DELETE /api/ideas/:id
 * @access  Private (Owner or Admin)
 */
const deleteIdea = async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id);

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && idea.submittedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this idea'
            });
        }

        idea.isActive = false;
        await idea.save();

        res.status(200).json({
            success: true,
            message: 'Idea deleted successfully'
        });
    } catch (error) {
        console.error('Delete idea error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete idea'
        });
    }
};

/**
 * @desc    Upvote idea
 * @route   POST /api/ideas/:id/upvote
 * @access  Private
 */
const upvoteIdea = async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id);

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        await idea.upvote(req.user._id);

        res.status(200).json({
            success: true,
            message: 'Upvote recorded',
            data: {
                upvoteCount: idea.upvoteCount,
                downvoteCount: idea.downvoteCount
            }
        });
    } catch (error) {
        console.error('Upvote idea error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upvote idea'
        });
    }
};

/**
 * @desc    Downvote idea
 * @route   POST /api/ideas/:id/downvote
 * @access  Private
 */
const downvoteIdea = async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id);

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        await idea.downvote(req.user._id);

        res.status(200).json({
            success: true,
            message: 'Downvote recorded',
            data: {
                upvoteCount: idea.upvoteCount,
                downvoteCount: idea.downvoteCount
            }
        });
    } catch (error) {
        console.error('Downvote idea error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to downvote idea'
        });
    }
};

/**
 * @desc    Add government response (Admin only)
 * @route   POST /api/ideas/:id/response
 * @access  Private/Admin
 */
const addGovernmentResponse = async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id);

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        idea.governmentResponse = {
            status: req.body.status,
            message: req.body.message,
            respondedBy: req.user._id,
            respondedAt: new Date(),
            estimatedImplementationDate: req.body.estimatedImplementationDate
        };

        if (req.body.newStatus) {
            idea.status = req.body.newStatus;
        }

        await idea.save();

        // Notify idea submitter
        await Notification.create({
            recipient: idea.submittedBy,
            sender: req.user._id,
            type: 'IdeaResponse',
            idea: idea._id,
            message: `Government has responded to your idea: "${idea.title}"`
        });

        res.status(200).json({
            success: true,
            message: 'Response added successfully',
            data: { idea }
        });
    } catch (error) {
        console.error('Add response error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add response'
        });
    }
};

/**
 * @desc    Update implementation progress (Admin only)
 * @route   PUT /api/ideas/:id/implementation
 * @access  Private/Admin
 */
const updateImplementation = async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id);

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        if (req.body.startDate) idea.implementation.startDate = req.body.startDate;
        if (req.body.completionDate) idea.implementation.completionDate = req.body.completionDate;
        if (req.body.progress !== undefined) idea.implementation.progress = req.body.progress;

        if (req.body.updateMessage) {
            idea.implementation.updates.push({
                message: req.body.updateMessage,
                updatedBy: req.user._id,
                updatedAt: new Date()
            });
        }

        await idea.save();

        // Notify idea submitter about update
        await Notification.create({
            recipient: idea.submittedBy,
            sender: req.user._id,
            type: 'IdeaUpdate',
            idea: idea._id,
            message: `Implementation update for your idea: "${idea.title}"`
        });

        res.status(200).json({
            success: true,
            message: 'Implementation updated successfully',
            data: { idea }
        });
    } catch (error) {
        console.error('Update implementation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update implementation'
        });
    }
};

/**
 * @desc    Get idea statistics (Admin)
 * @route   GET /api/ideas/admin/stats
 * @access  Private/Admin
 */
const getIdeaStats = async (req, res) => {
    try {
        const totalIdeas = await Idea.countDocuments({ isActive: true });
        const submittedIdeas = await Idea.countDocuments({ status: 'Submitted', isActive: true });
        const underReviewIdeas = await Idea.countDocuments({ status: 'Under Review', isActive: true });
        const approvedIdeas = await Idea.countDocuments({ status: 'Approved', isActive: true });
        const implementedIdeas = await Idea.countDocuments({ status: 'Implemented', isActive: true });

        const ideasByCategory = await Idea.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const topIdeas = await Idea.find({ isActive: true })
            .sort({ upvoteCount: -1 })
            .limit(5)
            .select('title upvoteCount category status')
            .populate('submittedBy', 'name');

        const recentIdeas = await Idea.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title category status createdAt')
            .populate('submittedBy', 'name');

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalIdeas,
                    submittedIdeas,
                    underReviewIdeas,
                    approvedIdeas,
                    implementedIdeas,
                    ideasByCategory,
                    topIdeas,
                    recentIdeas
                }
            }
        });
    } catch (error) {
        console.error('Get idea stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch idea statistics'
        });
    }
};

module.exports = {
    submitIdea,
    getAllIdeas,
    getIdeaById,
    updateIdea,
    deleteIdea,
    upvoteIdea,
    downvoteIdea,
    addGovernmentResponse,
    updateImplementation,
    getIdeaStats
};

const Policy = require('../models/Policy');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');
const { extractPDFText, deleteFile } = require('../utils/pdfUtils');

/**
 * @desc    Create new policy (Admin only)
 * @route   POST /api/policies
 * @access  Private/Admin
 */
const createPolicy = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            title,
            description,
            category,
            status,
            documentUrl,
            effectiveDate,
            tags
        } = req.body;

        // Handle PDF upload if file exists
        let pdfFilePath = null;
        let pdfContent = null;

        if (req.file) {
            pdfFilePath = req.file.path;
            try {
                pdfContent = await extractPDFText(pdfFilePath);
            } catch (error) {
                console.error('PDF extraction error:', error);
                // Continue without PDF content if extraction fails
            }
        }

        const policy = await Policy.create({
            title,
            description,
            category,
            status: status || 'Draft',
            documentUrl,
            pdfFilePath,
            pdfContent,
            effectiveDate,
            tags,
            createdBy: req.user._id
        });

        // Broadcast notification to all citizens
        try {
            const citizens = await User.find({ role: 'citizen', isActive: true }).select('_id');
            if (citizens.length > 0) {
                const notifications = citizens.map(citizen => ({
                    recipient: citizen._id,
                    sender: req.user._id,
                    type: 'AdminAlert',
                    policy: policy._id,
                    message: `New Policy Alert: "${policy.title}" has been introduced in the ${policy.category} category.`
                }));
                await Notification.insertMany(notifications);
            }
        } catch (notificationError) {
            console.error('Failed to broadcast policy notification:', notificationError);
        }

        res.status(201).json({
            success: true,
            message: 'Policy created successfully',
            data: { policy }
        });
    } catch (error) {
        console.error('Create policy error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create policy'
        });
    }
};

/**
 * @desc    Get all policies with filters
 * @route   GET /api/policies
 * @access  Public
 */
const getAllPolicies = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 100, // Increased default limit
            category,
            status,
            search,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        console.log('getAllPolicies called by:', req.user ? `${req.user.name} (${req.user.role})` : 'Guest');
        console.log('Query params:', { category, status, search, limit });

        // Build query
        const query = { isActive: true };

        if (category && category !== 'All') {
            query.category = category;
        }

        if (status && status !== 'All') {
            query.status = status;
        }

        // For non-admin users, only show published policies
        // If status is explicitly set, respect it (even for non-admins trying to filter)
        // But if no status filter or "All", non-admins only see Published
        if (!req.user || req.user.role !== 'admin') {
            // If user is not admin and no specific status filter, force Published
            if (!status || status === 'All') {
                query.status = 'Published';
            }
        }
        // If user IS admin and status is 'All' or not set, don't add status filter
        // This allows admin to see all policies

        console.log('Final query:', query);

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Sort options
        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;

        const policies = await Policy.find(query)
            .populate('createdBy', 'name email avatar')
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Policy.countDocuments(query);

        console.log(`Found ${policies.length} policies out of ${total} total`);

        res.status(200).json({
            success: true,
            data: {
                policies,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalPolicies: total,
                    hasMore: page * limit < total
                }
            }
        });
    } catch (error) {
        console.error('Get policies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch policies'
        });
    }
};

/**
 * @desc    Get single policy by ID
 * @route   GET /api/policies/:id
 * @access  Public
 */
const getPolicyById = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id)
            .populate('createdBy', 'name email avatar role');

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        // Check if user can view this policy
        if (policy.status !== 'Published' && (!req.user || req.user.role !== 'admin')) {
            return res.status(403).json({
                success: false,
                message: 'This policy is not yet published'
            });
        }

        // Increment view count
        await policy.incrementViews();

        // Check if current user has supported this policy
        let hasSupported = false;
        if (req.user) {
            hasSupported = policy.supporters.includes(req.user._id);
        }

        res.status(200).json({
            success: true,
            data: {
                policy,
                hasSupported
            }
        });
    } catch (error) {
        console.error('Get policy by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch policy'
        });
    }
};

/**
 * @desc    Update policy (Admin only)
 * @route   PUT /api/policies/:id
 * @access  Private/Admin
 */
const updatePolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        const {
            title,
            description,
            category,
            status,
            documentUrl,
            summary,
            effectiveDate,
            tags
        } = req.body;

        // Update fields
        if (title) policy.title = title;
        if (description) policy.description = description;
        if (category) policy.category = category;
        if (status) policy.status = status;
        if (documentUrl !== undefined) policy.documentUrl = documentUrl;
        if (summary !== undefined) policy.summary = summary;
        if (effectiveDate !== undefined) policy.effectiveDate = effectiveDate;
        if (tags) policy.tags = tags;

        // Handle PDF upload if new file exists
        if (req.file) {
            // Delete old PDF if exists
            if (policy.pdfFilePath) {
                await deleteFile(policy.pdfFilePath);
            }

            policy.pdfFilePath = req.file.path;
            try {
                policy.pdfContent = await extractPDFText(req.file.path);
            } catch (error) {
                console.error('PDF extraction error:', error);
            }
        }

        await policy.save();

        // Broadcast notification to all citizens
        try {
            const citizens = await User.find({ role: 'citizen', isActive: true }).select('_id');
            if (citizens.length > 0) {
                const notifications = citizens.map(citizen => ({
                    recipient: citizen._id,
                    sender: req.user._id,
                    type: 'AdminAlert',
                    policy: policy._id,
                    message: `Policy Updated: "${policy.title}" has been updated. Check out the latest changes!`
                }));
                await Notification.insertMany(notifications);
            }
        } catch (notificationError) {
            console.error('Failed to broadcast policy update notification:', notificationError);
        }

        res.status(200).json({
            success: true,
            message: 'Policy updated successfully',
            data: { policy }
        });
    } catch (error) {
        console.error('Update policy error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update policy'
        });
    }
};

/**
 * @desc    Delete policy (Admin only)
 * @route   DELETE /api/policies/:id
 * @access  Private/Admin
 */
const deletePolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        // Soft delete
        policy.isActive = false;
        await policy.save();

        res.status(200).json({
            success: true,
            message: 'Policy deleted successfully'
        });
    } catch (error) {
        console.error('Delete policy error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete policy'
        });
    }
};

/**
 * @desc    Get policy statistics (Admin only)
 * @route   GET /api/policies/stats
 * @access  Private/Admin
 */
const getPolicyStats = async (req, res) => {
    try {
        const totalPolicies = await Policy.countDocuments({ isActive: true });
        const draftPolicies = await Policy.countDocuments({ status: 'Draft', isActive: true });
        const publishedPolicies = await Policy.countDocuments({ status: 'Published', isActive: true });
        const underReviewPolicies = await Policy.countDocuments({ status: 'Under Review', isActive: true });

        // Get policies by category
        const policiesByCategory = await Policy.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Get most viewed policies
        const mostViewed = await Policy.find({ isActive: true, status: 'Published' })
            .sort({ viewCount: -1 })
            .limit(5)
            .select('title viewCount category');

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalPolicies,
                    draftPolicies,
                    publishedPolicies,
                    underReviewPolicies,
                    policiesByCategory,
                    mostViewed
                }
            }
        });
    } catch (error) {
        console.error('Get policy stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch policy statistics'
        });
    }
};

/**
 * @desc    Support/Upvote a policy
 * @route   POST /api/policies/:id/support
 * @access  Private
 */
const supportPolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        // Check if user already supported
        const userId = req.user._id;
        if (policy.supporters.includes(userId)) {
            return res.status(400).json({
                success: false,
                message: 'You have already supported this policy',
                alreadySupported: true
            });
        }

        // Add user to supporters and increment count
        policy.supporters.push(userId);
        policy.supportCount += 1;
        await policy.save();

        res.status(200).json({
            success: true,
            message: 'Support added successfully',
            data: {
                supportCount: policy.supportCount,
                alreadySupported: true
            }
        });
    } catch (error) {
        console.error('Support policy error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to support policy'
        });
    }
};

module.exports = {
    createPolicy,
    getAllPolicies,
    getPolicyById,
    updatePolicy,
    deletePolicy,
    getPolicyStats,
    supportPolicy
};

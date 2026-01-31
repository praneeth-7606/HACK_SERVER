const Comment = require('../models/Comment');
const Concern = require('../models/Concern');

// @desc    Add a comment to a concern
// @route   POST /api/comments/:concernId
// @access  Private
exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const concernId = req.params.concernId;

        const concern = await Concern.findById(concernId);
        if (!concern) {
            return res.status(404).json({ success: false, message: 'Concern not found' });
        }

        const comment = await Comment.create({
            text,
            concern: concernId,
            user: req.user._id
        });

        // Populate user details for immediate display
        await comment.populate('user', 'name');

        res.status(201).json({
            success: true,
            data: comment
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get comments for a concern
// @route   GET /api/comments/:concernId
// @access  Private
exports.getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ concern: req.params.concernId })
            .populate('user', 'name')
            .sort({ createdAt: -1 }); // Newest first

        res.status(200).json({
            success: true,
            count: comments.length,
            data: comments
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private (Owner or Admin)
exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        // Check ownership or admin role
        if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
        }

        await comment.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const express = require('express');
const { body } = require('express-validator');
const {
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
} = require('../controllers/ideaController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');

const router = express.Router();

// Validation rules
const ideaValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ min: 10, max: 200 }).withMessage('Title must be 10-200 characters'),
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ min: 50 }).withMessage('Description must be at least 50 characters'),
    body('category')
        .notEmpty().withMessage('Category is required'),
    body('targetArea')
        .trim()
        .notEmpty().withMessage('Target area is required'),
    body('expectedImpact')
        .notEmpty().withMessage('Expected impact is required')
];

// Public routes (authenticated users)
router.get('/', protect, getAllIdeas);
router.get('/:id', protect, getIdeaById);
router.post('/', protect, ideaValidation, submitIdea);
router.put('/:id', protect, updateIdea);
router.delete('/:id', protect, deleteIdea);

// Voting routes
router.post('/:id/upvote', protect, upvoteIdea);
router.post('/:id/downvote', protect, downvoteIdea);

// Admin only routes
router.post('/:id/response', protect, adminOnly, addGovernmentResponse);
router.put('/:id/implementation', protect, adminOnly, updateImplementation);
router.get('/admin/stats', protect, adminOnly, getIdeaStats);

module.exports = router;

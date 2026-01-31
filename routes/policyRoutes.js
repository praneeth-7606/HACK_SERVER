const express = require('express');
const { body } = require('express-validator');
const {
    createPolicy,
    getAllPolicies,
    getPolicyById,
    updatePolicy,
    deletePolicy,
    getPolicyStats,
    supportPolicy
} = require('../controllers/policyController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Validation rules
const policyValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ min: 10, max: 200 }).withMessage('Title must be 10-200 characters'),
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ min: 50 }).withMessage('Description must be at least 50 characters'),
    body('category')
        .notEmpty().withMessage('Category is required')
        .isIn([
            'Health',
            'Education',
            'Infrastructure',
            'Environment',
            'Economy',
            'Transportation',
            'Public Safety',
            'Housing',
            'Technology',
            'Other'
        ]).withMessage('Invalid category')
];

// Public routes (with optional auth for admin logic)
router.get('/', optionalProtect, getAllPolicies);
router.get('/:id', optionalProtect, getPolicyById);

// Protected routes (authenticated users)
router.post('/:id/support', protect, supportPolicy);

// Admin only routes
router.post('/', protect, adminOnly, upload.single('policyPdf'), policyValidation, createPolicy);
router.put('/:id', protect, adminOnly, upload.single('policyPdf'), updatePolicy);
router.delete('/:id', protect, adminOnly, deletePolicy);
router.get('/admin/stats', protect, adminOnly, getPolicyStats);

module.exports = router;

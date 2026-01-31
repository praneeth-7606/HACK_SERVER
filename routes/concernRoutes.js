const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const {
    createConcern,
    getAllConcerns,
    getMyConcerns,
    getConcernById,
    updateConcernStatus,
    deleteConcern,
    upvoteConcern,
    addComment,
    getCitizenStats
} = require('../controllers/concernController');

// DIAGNOSTIC: Test if this router is even reachable
router.get('/test-reach', (req, res) => {
    res.json({ success: true, message: 'Concern router is reachable' });
});

// Explicitly define routes with middleware to avoid any shadowing issues
// and ensure correct order of specificity

// 1. Specific Static Protected Routes
router.get('/my/all', protect, getMyConcerns);
router.get('/citizen/stats', protect, getCitizenStats);

// 2. Specific Static Public Routes
router.get('/', getAllConcerns);

// 3. Specific Action Routes (Protected)
router.post('/', protect, upload.single('image'), createConcern);
router.put('/:id/upvote', protect, upvoteConcern);
router.post('/:id/comments', protect, addComment);
router.put('/:id/status', protect, authorize('admin'), updateConcernStatus);
router.delete('/:id', protect, deleteConcern);

// 4. Generic Parameter Routes (MUST BE LAST)
router.get('/:id', getConcernById);

module.exports = router;

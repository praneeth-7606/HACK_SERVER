const express = require('express');
const { body } = require('express-validator');
const {
    summarizePolicy,
    chatWithPolicy,
    getSuggestedQuestions
} = require('../controllers/aiController');

const router = express.Router();

// Validation for chat
const chatValidation = [
    body('question')
        .trim()
        .notEmpty().withMessage('Question is required')
        .isLength({ min: 5, max: 500 }).withMessage('Question must be 5-500 characters')
];

// AI Routes (all public)
router.post('/summarize/:policyId', summarizePolicy);
router.post('/chat/:policyId', chatValidation, chatWithPolicy);
router.get('/suggestions/:policyId', getSuggestedQuestions);

module.exports = router;

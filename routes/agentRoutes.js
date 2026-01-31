const express = require('express');
const { body } = require('express-validator');
const {
    analyzeBudget,
    updateBudgetAllocation,
    approveBudgetAllocation,
    getAllBudgetAllocations,
    generatePDFReport
} = require('../controllers/agentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation
const budgetValidation = [
    body('totalBudget')
        .isNumeric().withMessage('Total budget must be a number')
        .custom(value => value > 0).withMessage('Total budget must be greater than 0')
];

// All routes require admin access
router.use(protect, authorize('admin'));

// Budget Planner Agent Routes
router.post('/budget-planner/analyze', budgetValidation, analyzeBudget);
router.get('/budget-planner', getAllBudgetAllocations);
router.put('/budget-planner/:id', updateBudgetAllocation);
router.post('/budget-planner/:id/approve', approveBudgetAllocation);
router.get('/budget-planner/:id/pdf', generatePDFReport);

module.exports = router;

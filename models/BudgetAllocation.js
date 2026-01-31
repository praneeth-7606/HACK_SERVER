const mongoose = require('mongoose');

const budgetAllocationSchema = new mongoose.Schema({
    totalBudget: {
        type: Number,
        required: true
    },
    allocatedBudget: {
        type: Number,
        required: true
    },
    contingencyReserve: {
        type: Number,
        required: true
    },
    allocations: [{
        idea: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Idea',
            required: true
        },
        allocatedBudget: {
            type: Number,
            required: true
        },
        priorityScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        priority: {
            type: String,
            enum: ['High', 'Medium', 'Low'],
            required: true
        },
        justification: {
            type: String,
            required: true
        },
        estimatedTimeline: String,
        expectedROI: {
            type: String,
            enum: ['High', 'Medium', 'Low']
        }
    }],
    summary: {
        type: String,
        required: true
    },
    recommendations: [String],
    status: {
        type: String,
        enum: ['Draft', 'Approved', 'Rejected'],
        default: 'Draft'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    fiscalYear: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('BudgetAllocation', budgetAllocationSchema);

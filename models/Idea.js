const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Idea title is required'],
        trim: true,
        minlength: [10, 'Title must be at least 10 characters'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Idea description is required'],
        minlength: [50, 'Description must be at least 50 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: {
            values: [
                'Revenue Generation',
                'Infrastructure Development',
                'Technology & Innovation',
                'Agriculture & Farming',
                'Education',
                'Healthcare',
                'Environment & Sustainability',
                'Transportation',
                'Tourism',
                'Public Safety',
                'Urban Planning',
                'Rural Development',
                'Employment & Skills',
                'Other'
            ],
            message: 'Please select a valid category'
        }
    },
    subCategory: {
        type: String,
        trim: true
    },
    targetArea: {
        type: String,
        required: [true, 'Target area/location is required'],
        trim: true
    },
    expectedImpact: {
        type: String,
        required: [true, 'Expected impact is required'],
        enum: ['Local', 'District', 'State', 'National']
    },
    estimatedBudget: {
        amount: {
            type: Number,
            min: 0
        },
        currency: {
            type: String,
            default: 'INR'
        },
        description: String
    },
    timeline: {
        proposed: String,
        description: String
    },
    benefits: [{
        type: String,
        trim: true
    }],
    challenges: [{
        type: String,
        trim: true
    }],
    resources: [{
        type: String,
        trim: true
    }],
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    tags: [{
        type: String,
        trim: true
    }],
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['Submitted', 'Under Review', 'Shortlisted', 'In Discussion', 'Approved', 'Funded', 'Implemented', 'Rejected', 'On Hold'],
        default: 'Submitted'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    visibility: {
        type: String,
        enum: ['Public', 'Private'],
        default: 'Public'
    },
    // Engagement metrics
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    upvoteCount: {
        type: Number,
        default: 0
    },
    downvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    downvoteCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    shareCount: {
        type: Number,
        default: 0
    },
    // Collaboration
    collaborators: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['Contributor', 'Supporter', 'Expert']
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Government response
    governmentResponse: {
        status: String,
        message: String,
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        respondedAt: Date,
        estimatedImplementationDate: Date
    },
    // Budget allocation (from AI agent)
    budgetAllocation: {
        allocatedBudget: {
            type: Number,
            default: 0
        },
        allocationPlan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BudgetAllocation'
        },
        allocatedAt: Date,
        allocatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        priorityScore: Number,
        justification: String
    },
    // Implementation tracking
    implementation: {
        startDate: Date,
        completionDate: Date,
        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        updates: [{
            message: String,
            updatedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            updatedAt: {
                type: Date,
                default: Date.now
            }
        }]
    },
    // Recognition
    awards: [{
        title: String,
        description: String,
        awardedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isFeatured: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes
ideaSchema.index({ category: 1, status: 1 });
ideaSchema.index({ submittedBy: 1 });
ideaSchema.index({ createdAt: -1 });
ideaSchema.index({ upvoteCount: -1 });
ideaSchema.index({ title: 'text', description: 'text' });

// Methods
ideaSchema.methods.incrementViews = async function () {
    this.viewCount += 1;
    return await this.save();
};

ideaSchema.methods.upvote = async function (userId) {
    if (!this.upvotes.includes(userId)) {
        this.upvotes.push(userId);
        this.upvoteCount += 1;
        // Remove from downvotes if exists
        const downvoteIndex = this.downvotes.indexOf(userId);
        if (downvoteIndex > -1) {
            this.downvotes.splice(downvoteIndex, 1);
            this.downvoteCount -= 1;
        }
        return await this.save();
    }
    return this;
};

ideaSchema.methods.downvote = async function (userId) {
    if (!this.downvotes.includes(userId)) {
        this.downvotes.push(userId);
        this.downvoteCount += 1;
        // Remove from upvotes if exists
        const upvoteIndex = this.upvotes.indexOf(userId);
        if (upvoteIndex > -1) {
            this.upvotes.splice(upvoteIndex, 1);
            this.upvoteCount -= 1;
        }
        return await this.save();
    }
    return this;
};

const Idea = mongoose.model('Idea', ideaSchema);

module.exports = Idea;

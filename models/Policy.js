const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Policy title is required'],
        trim: true,
        minlength: [10, 'Title must be at least 10 characters'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Policy description is required'],
        minlength: [50, 'Description must be at least 50 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: {
            values: [
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
            ],
            message: 'Please select a valid category'
        }
    },
    status: {
        type: String,
        enum: ['Draft', 'Under Review', 'Published', 'Archived'],
        default: 'Draft'
    },
    documentUrl: {
        type: String,
        default: null
    },
    pdfFilePath: {
        type: String,
        default: null // Path to uploaded PDF file
    },
    pdfContent: {
        type: String,
        default: null // Extracted text content from PDF
    },
    summary: {
        type: String,
        default: null // AI-generated summary
    },
    effectiveDate: {
        type: Date,
        default: null
    },
    tags: [{
        type: String,
        trim: true
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    viewCount: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    },
    supportCount: {
        type: Number,
        default: 0
    },
    supporters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
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

// Indexes for better query performance
policySchema.index({ category: 1, status: 1 });
policySchema.index({ createdAt: -1 });
policySchema.index({ title: 'text', description: 'text' });

// Increment view count
policySchema.methods.incrementViews = async function () {
    this.viewCount += 1;
    return await this.save();
};

// Get public info
policySchema.methods.getPublicInfo = function () {
    return {
        id: this._id,
        title: this.title,
        description: this.description,
        category: this.category,
        status: this.status,
        summary: this.summary,
        effectiveDate: this.effectiveDate,
        tags: this.tags,
        viewCount: this.viewCount,
        supportCount: this.supportCount,
        commentsCount: this.commentsCount,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

const Policy = mongoose.model('Policy', policySchema);

module.exports = Policy;

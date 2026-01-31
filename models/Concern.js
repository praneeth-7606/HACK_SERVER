const mongoose = require('mongoose');

const concernSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title for your concern'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please provide a description'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
        type: String,
        required: [true, 'Please select a category'],
        enum: [
            'Infrastructure',
            'Sanitation',
            'Public Safety',
            'Health',
            'Environment',
            'Transportation',
            'Utlities',
            'Other'
        ]
    },
    location: {
        type: String,
        required: [true, 'Please specify the location'],
        trim: true
    },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
        default: 'Pending'
    },
    imageUrl: {
        type: String,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        text: {
            type: String,
            required: [true, 'Comment text is required'],
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        isOfficial: {
            type: Boolean,
            default: false
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Concern', concernSchema);

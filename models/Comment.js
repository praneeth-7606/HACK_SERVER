const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: [true, 'Please provide comment text'],
        trim: true,
        maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    concern: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Concern',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Comment', commentSchema);

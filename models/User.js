const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { decrypt } = require('../utils/cryptoUtils');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include password in queries by default
    },
    role: {
        type: String,
        enum: {
            values: ['citizen', 'admin'],
            message: 'Role must be either citizen or admin'
        },
        default: 'citizen'
    },
    avatar: {
        type: String,
        default: function () {
            // Generate avatar based on name initials
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=6366f1&color=fff&size=128`;
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    // Enhanced Profile Fields (Stored as Encrypted Strings)
    aadharNumber: {
        type: String,
        default: null
    },
    panNumber: {
        type: String,
        default: null
    },
    phoneNumber: {
        type: String,
        trim: true,
        match: [/^\d{10}$/, 'Please enter a valid 10-digit mobile number'],
        default: null
    },
    address: {
        type: String,
        trim: true,
        maxlength: [200, 'Address cannot exceed 200 characters'],
        default: null
    },
    refreshToken: {
        type: String,
        select: false
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.password;
            delete ret.refreshToken;
            delete ret.__v;
            return ret;
        }
    }
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile
userSchema.methods.getPublicProfile = function () {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        avatar: this.avatar,
        isActive: this.isActive,
        aadharNumber: this.aadharNumber ? decrypt(this.aadharNumber) : null,
        panNumber: this.panNumber ? decrypt(this.panNumber) : null,
        phoneNumber: this.phoneNumber,
        address: this.address,
        createdAt: this.createdAt
    };
};

const User = mongoose.model('User', userSchema);

module.exports = User;

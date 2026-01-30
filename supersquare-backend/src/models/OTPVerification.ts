import mongoose from 'mongoose';

const otpVerificationSchema = new mongoose.Schema({
    identifier: {
        type: String,
        required: true
    },
    otpHash: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        enum: ['signup', 'reset', 'phone_verify'],
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// TTL Index to automatically delete documents after expiresAt
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTPVerification = mongoose.model('OTPVerification', otpVerificationSchema);

export default OTPVerification;

import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
    email: {
        type:String,
        required: true,
        unique: true,
        trim:true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        select: false, // Do not return password in queries
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    profilePicture: {
        type: String,
        default: 'https://example.com/default-profile-picture.png', // Default profile picture URL
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    lastLogin: {
        type: Date,
    },
    is2FAEnabled: {
        type: Boolean,
        select: false,
    },
    twoFAOtp: {
        type: String,
        select: false,
    },
    twoFAOtpExpires: {
        type: Date,
        select: false,
    },
}, { timestamps: true } );
const User = mongoose.model('User', userSchema);

export default User;
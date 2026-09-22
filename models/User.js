const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'provider'], default: 'customer' },
    categories: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
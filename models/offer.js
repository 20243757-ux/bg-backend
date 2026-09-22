const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    providerName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    price: { type: Number, required: true },
    message: { type: String, required: true },
    status: { type: String, default: 'Beklemede' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Offer', OfferSchema);
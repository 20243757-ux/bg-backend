const express = require('express');
const router = express.Router();
const Offer = require('../models/offer');

// 1. Yeni Teklif Gönder
router.post('/create', async (req, res) => {
    try {
        const { jobId, providerName, phoneNumber, price, message } = req.body;
        const newOffer = new Offer({ jobId, providerName, phoneNumber, price, message });
        await newOffer.save();
        res.status(201).json({ success: true, message: 'Teklifiniz iletildi!', offer: newOffer });
    } catch (error) {
        res.status(500).json({ success: false, message: `Hata: ${error.message}` });
    }
});

// 2. Bir İlana Gelen Teklifleri Listele
router.get('/job/:jobId', async (req, res) => {
    try {
        const offers = await Offer.find({ jobId: req.params.jobId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, offers });
    } catch (error) {
        res.status(500).json({ success: false, message: `Hata: ${error.message}` });
    }
});

// 3. Teklif Durumunu Güncelle (Kabul Et / Reddet)
router.patch('/status/:offerId', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedOffer = await Offer.findByIdAndUpdate(
            req.params.offerId,
            { status },
            { new: true }
        );
        res.status(200).json({ success: true, message: `Teklif ${status} olarak güncellendi!`, offer: updatedOffer });
    } catch (error) {
        res.status(500).json({ success: false, message: `Hata: ${error.message}` });
    }
});

module.exports = router;
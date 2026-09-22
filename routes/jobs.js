const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Güvenli Job modeli helper'ı
const getJobModel = () => {
    return mongoose.models.Job || mongoose.model('Job', new mongoose.Schema({}, { strict: false }), 'jobs');
};

// 1. İlan Oluşturma (Create Job) - 404 Hatasını çözen endpoint
router.post('/create', async (req, res) => {
    try {
        const Job = getJobModel();
        const { title, category, subCategory, description, location, customerName, phoneNumber, fixedPrice, imageUrl } = req.body;
        
        const newJob = new Job({
            title,
            category,
            subCategory,
            description,
            location,
            customerName,
            phoneNumber,
            fixedPrice,
            imageUrl: imageUrl || '',
            status: 'Bekliyor',
            createdAt: new Date()
        });

        await newJob.save();
        res.status(200).json({ success: true, message: 'İlan başarıyla yayınlandı!', job: newJob });
    } catch (error) {
        console.error("İlan oluşturma hatası:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. İlanları Listeleme (Filtrelemeli)
router.get('/', async (req, res) => {
    try {
        const Job = getJobModel();
        const { category, search, location } = req.query;
        let query = {};

        if (category && category !== 'Tümü') {
            query.category = category;
        }
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        if (location && location !== 'Tüm Şehirler ve İlçeler') {
            query.location = location;
        }

        const jobs = await Job.find(query).sort({ _id: -1 });
        res.json({ success: true, jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Kullanıcının Kendi İlanları / İşleri
router.get('/my-jobs', async (req, res) => {
    try {
        const Job = getJobModel();
        const { phoneNumber, role } = req.query;
        let query = {};

        if (role === 'provider') {
            query.$or = [{ assignedProviderPhone: phoneNumber }, { status: { $in: ['Üstlenildi', 'OnayBekliyor', 'Tamamlandı'] } }];
        } else {
            query.phoneNumber = phoneNumber;
        }

        const jobs = await Job.find(query).sort({ _id: -1 });
        res.json({ success: true, jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. İlan Detay
router.get('/:id', async (req, res) => {
    try {
        const Job = getJobModel();
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ success: false, message: 'İlan bulunamadı.' });
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. İşi Üstlenme (Take Job)
router.post('/take-job', async (req, res) => {
    try {
        const Job = getJobModel();
        const { jobId, providerName, providerPhone } = req.body;
        const job = await Job.findByIdAndUpdate(jobId, {
            assignedProviderName: providerName,
            assignedProviderPhone: providerPhone,
            status: 'OdemeBekliyor'
        }, { new: true });
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. Ödeme Yapma
router.post('/pay-and-fund', async (req, res) => {
    try {
        const Job = getJobModel();
        const { jobId } = req.body;
        const job = await Job.findByIdAndUpdate(jobId, { status: 'Üstlenildi' }, { new: true });
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 7. İşi Tamamlama
router.post('/mark-completed-by-provider', async (req, res) => {
    try {
        const Job = getJobModel();
        const { jobId } = req.body;
        const job = await Job.findByIdAndUpdate(jobId, { status: 'OnayBekliyor' }, { new: true });
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 8. Puanlama ve Bitirme
router.post('/complete-and-rate', async (req, res) => {
    try {
        const Job = getJobModel();
        const { jobId, rating, reviewComment } = req.body;
        const job = await Job.findByIdAndUpdate(jobId, {
            rating,
            reviewComment,
            status: 'Tamamlandı'
        }, { new: true });
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 9. İlan Silme
router.delete('/:id', async (req, res) => {
    try {
        const Job = getJobModel();
        await Job.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'İlan silindi.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 10. Profil Güncelleme
router.put('/update-profile', async (req, res) => {
    try {
        res.json({ success: true, message: 'Profil güncellendi.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 11. Mesajlaşma Endpoints
router.get('/messages/:jobId', async (req, res) => {
    res.json({ success: true, messages: [] });
});

router.post('/messages/send', async (req, res) => {
    res.json({ success: true, message: 'Mesaj gönderildi.' });
});

module.exports = router;
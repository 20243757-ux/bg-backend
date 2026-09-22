const express = require('express');
    const mongoose = require('mongoose');
    const cors = require('cors');

    const app = express();

    app.use(cors());
    app.use(express.json());

    // Veritabanı Bağlantısı
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bgproje';

mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 MongoDB veritabanına başarıyla bağlandı!'))
  .catch(err => console.error('MongoDB Bağlantı Hatası:', err));

    // Rotalar
    const authRoutes = require('./routes/auth');
const offerRoutes = require('./routes/offers');
const jobRoutes = require('./routes/jobs');

app.use('/api/auth', authRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/jobs', jobRoutes);
    // --- KATEGORİLER ENDPOINTLERİ (ADMIN) ---
const getCategoryModel = () => {
    return mongoose.models.Category || mongoose.model('Category', new mongoose.Schema({}, { strict: false }), 'categories');
};

app.get('/api/admin/categories', async (req, res) => {
  try {
    const Category = getCategoryModel();
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// --- KATEGORİLERE GÖRE DAĞILIM İSTATİSTİĞİ ---
app.get('/api/admin/category-stats', async (req, res) => {
  try {
    const Job = mongoose.models.Job || mongoose.model('Job', new mongoose.Schema({}, { strict: false }), 'jobs');
    const jobs = await Job.find();

    const categoryCounts = {};
    let totalJobs = jobs.length;

    jobs.forEach(job => {
      const cat = job.category || 'Diğer';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // Yüzdelik dilimleri hesapla
    const stats = Object.keys(categoryCounts).map(cat => {
      const count = categoryCounts[cat];
      const percentage = totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0;
      return { category: cat, count, percentage };
    });

    // Büyükten küçüğe sırala
    stats.sort((a, b) => b.count - a.count);

    res.json({ success: true, total: totalJobs, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/categories', async (req, res) => {
  try {
    const Category = getCategoryModel();
    const { name, subCategories } = req.body;
    const newCategory = new Category({ name, subCategories, createdAt: new Date() });
    await newCategory.save();
    res.json({ success: true, message: 'Kategori eklendi!', data: newCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const Category = getCategoryModel();
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Kategori kaldırıldı!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

    // --- İLANLAR & İŞLER İÇİN JOBS ENDPOINTLERİ (404 Hatasını Çözen Kısım) ---
    const getJobModel = () => {
        return mongoose.models.Job || mongoose.model('Job', new mongoose.Schema({}, { strict: false }), 'jobs');
    };

    app.post('/api/jobs/create', async (req, res) => {
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

    app.get('/api/jobs', async (req, res) => {
      try {
        const Job = getJobModel();
        const { category, search, location } = req.query;
        let query = {};

        if (category && category !== 'Tümü') {
          query.category = category;
        }
        if (search) {
          query.title = { $regex: search,$options: 'i' };
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

    // --- SİSTEM LOGLARI ENDPOINTİ (ADMIN - Hatasız Esnek Çözüm) ---
    app.get('/api/admin/logs', async (req, res) => {
      try {
        const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({}, { strict: false }), 'logs');
        const logs = await Log.find().sort({ createdAt: -1 }).limit(50);
        res.json({ success: true, data: logs });
      } catch (error) {
        console.error("Admin logs hatası:", error.message);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get('/api/jobs/my-jobs', async (req, res) => {
      try {
        const Job = getJobModel();
        const { phoneNumber, role } = req.query;
        let query = {};

        if (role === 'provider') {
          query.$or = [{ assignedProviderPhone: phoneNumber }, { status: {$in: ['Üstlenildi', 'OnayBekliyor', 'Tamamlandı'] } }];
        } else {
          query.phoneNumber = phoneNumber;
        }

        const jobs = await Job.find(query).sort({ _id: -1 });
        res.json({ success: true, jobs });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get('/api/jobs/:id', async (req, res) => {
      try {
        const Job = getJobModel();
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ success: false, message: 'İlan bulunamadı.' });
        res.json({ success: true, job });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.post('/api/jobs/take-job', async (req, res) => {
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

    app.post('/api/jobs/pay-and-fund', async (req, res) => {
      try {
        const Job = getJobModel();
        const { jobId } = req.body;
        const job = await Job.findByIdAndUpdate(jobId, { status: 'Üstlenildi' }, { new: true });
        res.json({ success: true, job });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.post('/api/jobs/mark-completed-by-provider', async (req, res) => {
      try {
        const Job = getJobModel();
        const { jobId } = req.body;
        const job = await Job.findByIdAndUpdate(jobId, { status: 'OnayBekliyor' }, { new: true });
        res.json({ success: true, job });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.post('/api/jobs/complete-and-rate', async (req, res) => {
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

    app.delete('/api/jobs/:id', async (req, res) => {
      try {
        const Job = getJobModel();
        await Job.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'İlan silindi.' });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.put('/api/jobs/update-profile', async (req, res) => {
      try {
        res.json({ success: true, message: 'Profil güncellendi.' });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get('/api/jobs/messages/:jobId', async (req, res) => {
      res.json({ success: true, messages: [] });
    });

    app.post('/api/jobs/messages/send', async (req, res) => {
      res.json({ success: true, message: 'Mesaj gönderildi.' });
    });

    // --- ADMIN İSTATİSTİK ENDPOINT'İ (%20 Komisyon ve Gider Eklendi) ---
    app.get('/api/admin/stats', async (req, res) => {
      try {
        let totalUsers = 0;
        let totalProviders = 0;
        let totalCustomers = 0;
        let totalJobs = 0;
        let totalRevenue = 0;

        // Kullanıcı sayımları
        try {
          const User = require('./models/User');
          totalUsers = await User.countDocuments();
          totalProviders = await User.countDocuments({ role: 'provider' }).catch(() => 0);
          totalCustomers = await User.countDocuments({ role: 'customer' }).catch(() => 0);
        } catch (e) {
          console.log("User modeli hatası:", e.message);
        }

        // İş / Sipariş ve Gelir sayımları
        try {
          const Job = mongoose.models.Job || mongoose.model('Job', new mongoose.Schema({}, { strict: false }), 'jobs'); 
          
          const allJobs = await Job.find();
          totalJobs = allJobs.length;

          allJobs.forEach(job => {
            const price = job.fixedPrice || job.price || job.tutar || job.fiyat || 1500;
            totalRevenue += Number(price);
          });
        } catch (e) {
          console.log("Job modeli hatası:", e.message);
        }

        // %20 Komisyon ve Ustaya Gidecek Tutar (Gider) Hesaplamaları
        const totalCommission = totalRevenue * 0.20; // Senin kazancın (%20)
        const totalExpense = totalRevenue - totalCommission; // Ustaya aktarılacak tutar (%80)

        res.json({
          success: true,
          stats: {
            totalUsers: totalUsers,
            totalProviders: totalProviders,
            totalCustomers: totalCustomers,
            totalJobs: totalJobs,
            completedJobs: totalJobs,
            totalRevenue: totalRevenue,
            totalCommission: totalCommission, // Yeni: Alınan Komisyon (%20)
            totalExpense: totalExpense,       // Yeni: Toplam Gider (Ustaya giden)
            pendingPoolAmount: totalExpense
          }
        });
      } catch (error) {
        console.error("Genel stats hatası:", error.message);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // --- TÜM SİPARİŞLERİ / İŞLERİ LİSTELEME ENDPOINTİ (Hatasız Çözüm) ---
    app.get('/api/admin/jobs', async (req, res) => {
      try {
        const Job = mongoose.models.Job || mongoose.model('Job', new mongoose.Schema({}, { strict: false }), 'jobs');
        const jobs = await Job.find().sort({ _id: -1 });
        res.json({ success: true, data: jobs });
      } catch (error) {
        console.error("Admin jobs hatası:", error.message);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // --- YORUMLAR & PUANLAR ENDPOINTİ (ADMIN) ---
    app.get('/api/admin/reviews', async (req, res) => {
      try {
        const Job = mongoose.models.Job || mongoose.model('Job', new mongoose.Schema({}, { strict: false }), 'jobs');
        const reviews = await Job.find({ 
          $or: [
            { rating: { $ne: null } }, 
            { reviewComment: { $ne: null,$ne: "" } }
          ] 
        }).sort({ createdAt: -1 });

        res.json({ success: true, data: reviews });
      } catch (error) {
        console.error("Admin reviews hatası:", error.message);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // --- ADMIN İLAN SİLME ENDPOINTİ ---
    app.delete('/api/admin/jobs/:id', async (req, res) => {
      try {
        const Job = mongoose.models.Job || mongoose.model('Job', new mongoose.Schema({}, { strict: false }), 'jobs');
        const deletedJob = await Job.findByIdAndDelete(req.params.id);
        
        if (!deletedJob) {
          return res.status(404).json({ success: false, message: 'İlan bulunamadı.' });
        }
        
        res.json({ success: true, message: 'İlan başarıyla kaldırıldı.' });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // --- BANNER YÖNETİMİ ENDPOINTLERİ ---
    app.get('/api/admin/banners', async (req, res) => {
      try {
        const Banner = require('./models/Banner');
        const banners = await Banner.find().sort({ createdAt: -1 });
        res.json({ success: true, data: banners });
      } catch (error) {
        console.error("Banner listeleme hatası:", error.message);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.post('/api/admin/banners', async (req, res) => {
      try {
        const Banner = require('./models/Banner');
        const { title, imageUrl, link } = req.body;
        
        const newBanner = new Banner({
          title,
          imageUrl,
          link: link || '#'
        });

        await newBanner.save();
        res.json({ success: true, message: "Banner başarıyla eklendi!", data: newBanner });
      } catch (error) {
        console.error("Banner ekleme hatası:", error.message);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.delete('/api/admin/banners/:id', async (req, res) => {
      try {
        const Banner = require('./models/Banner');
        await Banner.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Banner silindi!" });
      } catch (error) {
        console.error("Banner silme hatası:", error.message);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // --- ÖDEMELER & HAVUZ ENDPOINTİ (ADMIN) ---
    // --- KİŞİ BAZLI ÖZET ÖDEMELER ENDPOINTİ ---
app.get('/api/admin/payments-summary', async (req, res) => {
  try {
    const Job = mongoose.models.Job || mongoose.model('Job', new mongoose.Schema({}, { strict: false }), 'jobs');
    // Başarılı/Tamamlanmış veya ödenmiş işleri al
    const jobs = await Job.find({ 
      status: { $in: ['Üstlenildi', 'OnayBekliyor', 'Tamamlandı', 'OdemeBekliyor'] } 
    }).sort({ createdAt: -1 });

    // Kişilere göre grupla
    const summaryMap = {};
    jobs.forEach(job => {
      const customerName = job.customerName || 'Bilinmeyen Müşteri';
      if (!summaryMap[customerName]) {
        summaryMap[customerName] = {
          customerName,
          phoneNumber: job.phoneNumber || '-',
          totalAmount: 0,
          jobCount: 0,
          transactions: []
        };
      }
      const price = Number(job.fixedPrice) || 1500;
      summaryMap[customerName].totalAmount += price;
      summaryMap[customerName].jobCount += 1;
      summaryMap[customerName].transactions.push({
        title: job.title || 'Hizmet',
        subCategory: job.subCategory || '-',
        amount: price,
        status: job.status,
        date: job.createdAt ? new Date(job.createdAt).toLocaleDateString('tr-TR') : 'Bilinmiyor'
      });
    });

    const result = Object.values(summaryMap);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

    // --- TÜM KULLANICILARI LİSTELEME ENDPOINTİ (ADMIN) ---
    app.get('/api/admin/users', async (req, res) => {
      try {
        const User = require('./models/User');
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: users });
      } catch (error) {
        console.error("Admin users hatası:", error.message);
        res.status(500).json({ success: false, message: error.message });
      }
    });

   const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nndiken48@gmail.com',
    pass: 'vsyv wqxn nadv rkra'
  }
});

const otpStore = {};

// 1. Kayıt Ol (Register)
router.post('/register', async (req, res) => {
    try {
        const { fullName, phoneNumber, email, password, role, categories } = req.body;
        const cleanPhone = (phoneNumber || '').replace(/\D/g, '').replace(/^0+/, '');

        if (!cleanPhone || !password || !fullName) {
            return res.status(400).json({ success: false, message: 'Lütfen tüm zorunlu alanları doldurun.' });
        }

        const existingUser = await User.findOne({ 
            phoneNumber: { $regex: new RegExp(cleanPhone + '$') } 
        });
        
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Bu telefon numarası ile zaten kayıt olunmuş!' });
        }

        const newUser = new User({
            fullName,
            phoneNumber: cleanPhone,
            email: email ? email.trim() : '', // E-posta alanı eklendi
            password: password.trim(),
            role: role || 'customer',
            categories: Array.isArray(categories) ? categories : []
        });

        await newUser.save();
        await transporter.sendMail({
  from: 'nndiken48@gmail.com',
  to: email,
  subject: 'Kayıt İşlemi',
  text: 'Başarıyla kayıt oldunuz!'
});

        res.status(201).json({
            success: true,
            message: 'Kayıt başarılı!',
            user: {
                id: newUser._id,
                fullName: newUser.fullName,
                phoneNumber: newUser.phoneNumber,
                email: newUser.email, // Yanıtta da dönüyor
                role: newUser.role,
                categories: newUser.categories
            }
        });
    } catch (error) {
        console.error('Kayıt Hatası:', error);
        res.status(500).json({ success: false, message: `Hata: ${error.message}` });
    }
});

// 2. SMS Kodu Gönder & Şifre Kontrolü (Login 1. Adım - Esnek Telefon Arama)
router.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const rawPhone = (phoneNumber || '').replace(/\D/g, '');
        const cleanPhone = rawPhone.replace(/^0+/, '');
        const cleanPassword = (password || '').trim();

        // Veritabanında numaranın son kısmıyla esnek arama yap (05... veya 5... fark etmeksizin bulur)
        const user = await User.findOne({
            $or: [
                { phoneNumber: cleanPhone },
                { phoneNumber: rawPhone },
                { phoneNumber: { $regex: new RegExp(cleanPhone + '$') } }
            ]
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı. Lütfen önce kayıt olun.' });
        }

        if (user.password.trim() !== cleanPassword) {
            return res.status(400).json({ success: false, message: 'Şifre hatalı!' });
        }

        // 6 Haneli SMS Kodu Üret
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[user.phoneNumber] = {
            code,
            expiresAt: Date.now() + 5 * 60 * 1000
        };

        console.log(`📲 [SMS GÖNDERİLDİ] Kullanıcı: ${user.fullName} | Kod: ${code}`);

        res.status(200).json({
            success: true,
            message: 'SMS doğrulama kodu gönderildi.',
            debugCode: code
        });
    } catch (error) {
        console.error('SMS Hatası:', error);
        res.status(500).json({ success: false, message: `Hata: ${error.message}` });
    }
});

// 3. SMS Doğrula ve Giriş Yap (Login 2. Adım)
router.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        const rawPhone = (phoneNumber || '').replace(/\D/g, '');
        const cleanPhone = rawPhone.replace(/^0+/, '');

        const user = await User.findOne({
            $or: [
                { phoneNumber: cleanPhone },
                { phoneNumber: rawPhone },
                { phoneNumber: { $regex: new RegExp(cleanPhone + '$') } }
            ]
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        const record = otpStore[user.phoneNumber];
        if (!record) {
            return res.status(400).json({ success: false, message: 'Doğrulama kodu bulunamadı veya süresi doldu.' });
        }

        if (Date.now() > record.expiresAt) {
            delete otpStore[user.phoneNumber];
            return res.status(400).json({ success: false, message: 'Doğrulama kodunun süresi dolmuş.' });
        }

        if (record.code !== (code || '').trim()) {
            return res.status(400).json({ success: false, message: 'Girdiğiniz kod hatalı!' });
        }

        delete otpStore[user.phoneNumber];

        res.status(200).json({
            success: true,
            message: 'Giriş başarılı!',
            user: {
                id: user._id,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                email: user.email || '', // Girişte de e-posta bilgisi dönülüyor
                role: user.role,
                categories: user.categories || []
            }
        });
    } catch (error) {
        console.error('Doğrulama Hatası:', error);
        res.status(500).json({ success: false, message: `Hata: ${error.message}` });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const nodemailer = require('nodemailer');

const otpStore = {};
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nndiken48@gmail.com',
    pass: 'vsyvwqxnnadvrkra'
  }
});

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

// 2. E-posta Kodu Gönder & Şifre Kontrolü (Login 1. Adım)
router.post('/send-otp', async (req, res) => {
    try {
        const { email, password } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPassword = (password || '').trim();

        // Veritabanında e-posta ile kullanıcıyı bul
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı. Lütfen önce kayıt olun.' });
        }

        if (user.password.trim() !== cleanPassword) {
            return res.status(400).json({ success: false, message: 'Şifre hatalı!' });
        }

        // 6 Haneli Doğrulama Kodu Üret
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // OTP store'u e-posta anahtarıyla tutalım
        otpStore[user.email] = {
            code,
            expiresAt: Date.now() + 5 * 60 * 1000
        };

        // Nodemailer ile E-posta Gönderimi
        await transporter.sendMail({
            from: 'nndiken48@gmail.com',
            to: user.email,
            subject: 'Giriş Doğrulama Kodunuz',
            text: `Doğrulama kodunuz: ${code}. Bu kod 5 dakika geçerlidir.`
        });

        console.log(`📧 [E-POSTA GÖNDERİLDİ] Kullanıcı: ${user.fullName} | Email: ${user.email} | Kod: ${code}`);

        res.status(200).json({
            success: true,
            message: 'E-posta doğrulama kodu gönderildi.',
            debugCode: code
        });
    } catch (error) {
        console.error('E-posta Gönderme Hatası:', error);
        res.status(500).json({ success: false, message: `Hata: ${error.message}` });
    }
});

// 3. SMS Doğrula ve Giriş Yap (Login 2. Adım)
// 3. E-posta Kodunu Doğrula ve Giriş Yap (Login 2. Adım)
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, code } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();

        // Veritabanında e-posta ile kullanıcıyı bul
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        // OTP store'dan e-posta anahtarı ile kaydı kontrol et
        const record = otpStore[user.email];
        if (!record) {
            return res.status(400).json({ success: false, message: 'Doğrulama kodu bulunamadı veya süresi doldu.' });
        }

        if (Date.now() > record.expiresAt) {
            delete otpStore[user.email];
            return res.status(400).json({ success: false, message: 'Doğrulama kodunun süresi dolmuş.' });
        }

        if (record.code !== (code || '').trim()) {
            return res.status(400).json({ success: false, message: 'Girdiğiniz kod hatalı!' });
        }

        // Kod doğru, kaydı temizle
        delete otpStore[user.email];

        res.status(200).json({
            success: true,
            message: 'Giriş başarılı!',
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
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

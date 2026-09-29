const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Brevo HTTP API Yapılandırması
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = 'xsmtpsib-51cb929f9c3c6492f55eaf1b05876e36e58d8c81e70b90e033e03f449264d115-eRtwxzm56M52vA0p';

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Ortak E-Posta Gönderme Fonksiyonu (HTTP API)
async function sendEmailViaBrevo(toEmail, toName, subject, textContent) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: 'bbaea9001@smtp-brevo.com', name: 'Big Anatolia' };
    sendSmtpEmail.to = [{ email: toEmail, name: toName || 'Kullanıcı' }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.textContent = textContent;

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`📧 [BREVO API] E-posta başarıyla gönderildi: ${toEmail}`);
    } catch (error) {
        console.error('E-posta Gönderme Hatası:', error);
        throw error;
    }
}

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
            email: email ? email.trim() : '', 
            password: password.trim(),
            role: role || 'customer',
            categories: Array.isArray(categories) ? categories : []
        });

        await newUser.save();

        if (email) {
            await sendEmailViaBrevo(email, fullName, 'Kayıt İşlemi', 'Başarıyla kayıt oldunuz!');
        }

        res.status(201).json({
            success: true,
            message: 'Kayıt başarılı!',
            user: {
                id: newUser._id,
                fullName: newUser.fullName,
                phoneNumber: newUser.phoneNumber,
                email: newUser.email,
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
const otpStore = {};

router.post('/send-otp', async (req, res) => {
    try {
        const { email, password } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPassword = (password || '').trim();

        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı. Lütfen önce kayıt olun.' });
        }

        if (user.password.trim() !== cleanPassword) {
            return res.status(400).json({ success: false, message: 'Şifre hatalı!' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        otpStore[user.email] = {
            code,
            expiresAt: Date.now() + 5 * 60 * 1000
        };

        await sendEmailViaBrevo(user.email, user.fullName, 'Giriş Doğrulama Kodunuz', `Doğrulama kodunuz: ${code}. Bu kod 5 dakika geçerlidir.`);

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

// 3. E-posta Kodunu Doğrula ve Giriş Yap (Login 2. Adım)
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, code } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();

        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

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

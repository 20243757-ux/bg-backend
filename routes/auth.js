const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Brevo HTTP API Yapılandırması
let defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = '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';

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Ortak E-Posta Gönderme Fonksiyonu (HTTP API)
async function sendEmailViaBrevo(toEmail, toName, subject, textContent) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: 'babacinar061@gmail.com', name: 'Big Anatolia' };
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

// Geçici Kayıt OTP Deposu
const registerOtpStore = {};

// 1. Kayıt Ol (Register - Adım 1: Bilgileri Al ve OTP Gönder)
router.post('/register', async (req, res) => {
    try {
        const { fullName, phoneNumber, email, password, role, categories } = req.body;
       const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
        const cleanEmail = (email || '').trim().toLowerCase();

        // Buraya ekliyoruz:
       if (cleanPhone.length !== 11 || !cleanPhone.startsWith('0')) {
  return res.status(400).json({ success: false, message: 'Telefon numarası eksik veya hatalı! Lütfen başında 0 olacak şekilde 11 hane giriniz.' });
}

        const existingUserByPhone = await User.findOne({ 
            phoneNumber: { $regex: new RegExp(cleanPhone + '$') } 
        });
        const existingUserByEmail = await User.findOne({ 
    email: { $regex: new RegExp('^' + cleanEmail + '$', 'i') } 
});

        if (existingUserByPhone) {
            return res.status(400).json({ success: false, message: 'Bu telefon numarası ile zaten kayıt olunmuş!' });
        }
        if (existingUserByEmail) {
            return res.status(400).json({ success: false, message: 'Bu e-posta adresi ile zaten kayıt olunmuş!' });
        }
        if (registerOtpStore[cleanEmail]) {
            return res.status(400).json({ success: false, message: 'Bu e-posta adresi için halihazırda bekleyen bir doğrulama kodu var!' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Kullanıcı bilgilerini geçici olarak sakla, henüz DB'ye kaydetmiyoruz
        registerOtpStore[cleanEmail] = {
            code,
            expiresAt: Date.now() + 5 * 60 * 1000,
            userData: {
                fullName,
                phoneNumber: cleanPhone,
                email: cleanEmail,
                password: password.trim(),
                role: role || 'customer',
                categories: Array.isArray(categories) ? categories : []
            }
        };

        await sendEmailViaBrevo(cleanEmail, fullName, 'Kayıt Doğrulama Kodunuz', `Kayıt doğrulama kodunuz: ${code}. Bu kod 5 dakika geçerlidir.`);

        res.status(200).json({
            success: true,
            message: 'Doğrulama kodu e-postanıza gönderildi.',
            debugCode: code
        });
    } catch (error) {
        console.error('Kayıt Başlangıç Hatası:', error);
        res.status(500).json({ success: false, message: `Hata: ${error.message}` });
    }
});

// 1.5. Kayıt OTP Kodunu Doğrula ve Kullanıcıyı Veritabanına Kaydet (Adım 2)
// 1.5. Kayıt OTP Kodunu Doğrula ve Kullanıcıyı Veritabanına Kaydet
// 1.5. Kayıt OTP Kodunu Doğrula ve Kullanıcıyı Veritabanına Kaydet
router.post('/verify-register-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    const record = registerOtpStore[cleanEmail];
    if (!record) {
      return res.status(400).json({ success: false, message: 'Doğrulama kodu bulunamadı veya süresi doldu.' });
    }
    if (Date.now() > record.expiresAt) {
      delete registerOtpStore[cleanEmail];
      return res.status(400).json({ success: false, message: 'Doğrulama kodunun süresi dolmuş.' });
    }

    // KRİTİK KONTROL BURASI: Girilen kod ile saklanan kod eşleşiyor mu?
    if (String(record.code).trim() !== String(code).trim()) {
      return res.status(400).json({ success: false, message: 'Girdiğiniz kod hatalı.' });
    }

    // Kod doğru! Artık kullanıcıyı veritabanına kaydedebiliriz.
    const newUser = new User(record.userData);
    await newUser.save();

    delete registerOtpStore[cleanEmail];

    res.status(201).json({
      success: true,
      message: 'Kayıt başarıyla tamamlandı.',
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
    console.error('Kayıt Doğrulama Hatası:', error);
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

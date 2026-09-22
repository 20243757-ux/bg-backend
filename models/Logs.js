const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userName: String,
  userRole: String,
  ipAddress: String,
  location: String,
  action: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);
const geoip = require('geoip-lite');
const Log = require('./models/Log');

// İstek atıldığında IP'yi alma:
const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
const cleanIp = ip === '::1' || ip === '127.0.0.1' ? '176.235.10.50' : ip; // Lokal testler için örnek dış IP

const geo = geoip.lookup(cleanIp);
const locationInfo = geo ? `${geo.country} / ${geo.city || 'Bilinmiyor'}` : 'Adana / Seyhan (Yerel)';

await Log.create({
  userName: user.fullName,
  userRole: user.role,
  ipAddress: cleanIp,
  location: locationInfo,
  action: 'Sisteme Giriş Yapıldı'
});
const navItems = document.querySelectorAll('.nav-item');
const dashboard = document.getElementById('dashboardPage');
const generic = document.getElementById('genericPage');
const pageTitle = document.getElementById('pageTitle');
const genericTitle = document.getElementById('genericTitle');
const genericHeading = document.getElementById('genericHeading');
const genericDesc = document.getElementById('genericDesc');
const toast = document.getElementById('toast');

const pageData = {
  users: ['Kullanıcılar', 'Müşteri kayıtları, hesap yönetimi ve güvenli erişim.'],
  providers: ['Hizmet Verenler (Ustalar)', 'Usta başvuruları, uzmanlık alanları ve performans.'],
  customers: ['Hizmet Alanlar', 'Sistem üzerinden hizmet talep eden kullanıcılar.'],
  services: ['Hizmetler', 'Sistemdeki iş ilanları, kimin açtığı ve işin durumları.'],
  hizmetler: ['Hizmetler', 'Sistemdeki iş ilanları, kimin açtığı ve işin durumları.'],
  payments: ['Ödemeler & Havuz', 'Güvenli havuzda bekleyen tutarlar ve IBAN transferleri.'],
  reviews: ['Yorumlar & Puanlar', 'Müşterilerin ustalar için yaptığı değerlendirmeler.'],
  logs: ['Sistem Logları', 'Yönetici ve kullanıcı hareketlerinin kayıtları.']
};

function showToast(text = 'İşlem başarıyla gerçekleştirildi.') {
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

// Menü geçişleri ve sayfa başlık dinamikleri
navItems.forEach(item => {
  item.addEventListener('click', async (e) => {
    e.preventDefault();
    
    navItems.forEach(x => x.classList.remove('active'));
    item.classList.add('active');
    
    const page = (item.getAttribute('data-page') || item.dataset.page || '').trim().toLowerCase();
    const menuText = item.textContent.trim().toLowerCase();
    
    if (pageTitle) pageTitle.textContent = item.textContent.trim();

    const dashboardPage = document.getElementById('dashboardPage');
    const genericPage = document.getElementById('genericPage');

    if (!dashboardPage || !genericPage) return;

    if (page === 'dashboard' || menuText.includes('dashboard')) {
      dashboardPage.classList.remove('hidden');
      genericPage.classList.add('hidden');
      if (pageTitle) pageTitle.textContent = 'Dashboard';
      fetchDashboardStats(); 
    } else {
      dashboardPage.classList.add('hidden');
      genericPage.classList.remove('hidden');
      
      const data = pageData[page] || [item.textContent.trim(), 'Yönetim ekranı.'];
      if (genericTitle) genericTitle.textContent = data[0];
      if (genericHeading) genericHeading.textContent = data[0];
      if (genericDesc) genericDesc.textContent = data[1];
      
      if (page === 'users' || menuText === 'kullanıcılar' || (menuText.includes('kullanıcılar') && !menuText.includes('veren') && !menuText.includes('alan'))) {
        await loadUsersData('all');
      } else if (page === 'providers' || menuText.includes('hizmet verenler') || menuText.includes('ustalar')) {
        await loadUsersData('providers');
      } else if (page === 'customers' || menuText.includes('hizmet alanlar')) {
        await loadUsersData('customers');
      } else if (page === 'services' || page === 'hizmetler' || (menuText.includes('hizmetler') && !menuText.includes('veren') && !menuText.includes('alan'))) {
        await loadServicesData(); 
      } else if (page === 'payments' || menuText.includes('ödemeler') || menuText.includes('havuz')) {
        await loadPaymentsData(); // Ödemeler tablosunu yükler
      } else {
        genericPage.innerHTML = `<div style="padding: 40px; text-align: center; background: white; border-radius: 12px;"><h3 style="color: #374151;">${data[0]} Modülü</h3><p style="color: #9ca3af; margin-top: 10px;">Bu bölüm hazırlanıyor.</p></div>`;
      }
    }
    
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  });
});

async function fetchDashboardStats() {
  try {
    const response = await fetch('http://localhost:3000/api/admin/stats');
    const data = await response.json();
    if (data.success && data.stats) {
      const statCards = document.querySelectorAll('.stat-card');
      if (statCards.length >= 5) {
        statCards[0].querySelector('strong').textContent = data.stats.totalUsers;     
        statCards[1].querySelector('strong').textContent = data.stats.totalProviders; 
        statCards[2].querySelector('strong').textContent = data.stats.totalCustomers; 
        statCards[3].querySelector('strong').textContent = data.stats.totalJobs;      
        statCards[4].querySelector('strong').textContent = "₺" + data.stats.totalRevenue.toLocaleString('tr-TR'); 
      }
    }
  } catch (error) {
    console.error("Dashboard verileri çekilirken hata oluştu:", error);
  }
}

const menuBtn = document.getElementById('menuBtn');
if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

fetchDashboardStats();

async function deleteJobByAdmin(jobId) {
  if (!confirm("Bu ilanı uygunsuz olduğu için kaldırmak istediğinize emin misiniz?")) return;

  try {
    const response = await fetch(`http://localhost:3000/api/admin/jobs/${jobId}`, {
      method: 'DELETE',
    });
    const data = await response.json();

    if (data.success) {
      showToast("İlan başarıyla kaldırıldı!");
      loadServicesData();      
      fetchDashboardStats();   
    } else {
      showToast("İlan kaldırılamadı: " + (data.message || 'Bilinmeyen hata'));
    }
  } catch (error) {
    console.error("Silme işlemi sırasında hata:", error);
    showToast("Sunucuya ulaşılamadı.");
  }
}

// --- HİZMETLER VE İLANLAR TABLOSU ---
async function loadServicesData() {
  try {
    const response = await fetch('http://localhost:3000/api/admin/jobs');
    const result = await response.json();
    
    if (result.success || result.jobs || result.data || Array.isArray(result)) {
      const jobs = result.jobs || result.data || result || [];
      const genericPage = document.getElementById('genericPage');
      if (!genericPage) return;

      let htmlContent = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 22px; font-weight: 700; color: #111; margin: 0;">Hizmetler ve İlanlar Listesi</h2>
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">Sistemdeki tüm iş ilanları, müşteriler, açıklamalar ve talep durumları.</p>
          </div>
          <span style="background: #eef2ff; color: #4f46e5; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;">Toplam ${jobs.length} İlan</span>
        </div>

        <div style="background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); overflow: hidden;">
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid #f3f4f6; color: #6b7280; font-size: 13px; background: #f9fafb;">
                  <th style="padding: 14px 16px;">Müşteri (İlanı Açan)</th>
                  <th style="padding: 14px 16px;">İş İlanı Başlığı</th>
                  <th style="padding: 14px 16px;">Açıklama</th>
                  <th style="padding: 14px 16px;">Üstlenen Usta</th>
                  <th style="padding: 14px 16px;">Talep Durumu</th>
                  <th style="padding: 14px 16px;">İşlem</th>
                </tr>
              </thead>
              <tbody>`;

      if (jobs.length === 0) {
        htmlContent += `<tr><td colspan="6" style="padding: 40px; text-align: center; color: #9ca3af; font-size: 14px;">Henüz sistemde kayıtlı bir iş ilanı bulunmuyor.</td></tr>`;
      } else {
        jobs.forEach(job => {
          const customer = job.customerName || job.user?.name || job.user?.fullName || job.customer?.name || job.createdBy?.name || job.userId?.name || job.userName || 'Bilinmiyor';
          const jobTitle = job.title || job.name || 'İsimsiz İlan';
          const jobDesc = job.description || job.desc || 'Açıklama belirtilmemiş.';
          const worker = job.assignedProviderName || job.provider?.name || job.provider?.fullName || job.assignedTo?.name || job.workerName || job.providerName || 'Atanmadı / Bekliyor';
          const status = job.status || job.state || 'Beklemede';

          let statusBg = '#eef2ff';
          let statusColor = '#4f46e5';
          const lowerStatus = String(status).toLowerCase();
          if (lowerStatus.includes('tamam') || lowerStatus.includes('completed')) {
            statusBg = '#dcfce7'; statusColor = '#16a34a';
          } else if (lowerStatus.includes('devam') || lowerStatus.includes('onay') || lowerStatus.includes('accepted') || lowerStatus.includes('üstlenildi')) {
            statusBg = '#fef3c7'; statusColor = '#d97706';
          }

          htmlContent += `<tr style="border-bottom: 1px solid #f9fafb;">
            <td style="padding: 14px 16px; color: #111827; font-weight: 500; font-size: 14px;">${customer}</td>
            <td style="padding: 14px 16px; color: #111827; font-weight: 500; font-size: 14px;">${jobTitle}</td>
            <td style="padding: 14px 16px; color: #4b5563; font-size: 13px; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${jobDesc}">${jobDesc}</td>
            <td style="padding: 14px 16px; color: #4b5563; font-size: 14px;">${worker}</td>
            <td style="padding: 14px 16px;"><span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">${status}</span></td>
            <td style="padding: 14px 16px;">
              <button onclick="deleteJobByAdmin('${job._id || job.id}')" style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;">Kaldır</button>
            </td>
          </tr>`;
        });
      }

      htmlContent += `</tbody></table></div></div>`;
      genericPage.innerHTML = htmlContent;
      showToast(`${jobs.length} adet hizmet ilanı listelendi.`);
    }
  } catch (err) {
    console.error("Hizmetler yüklenirken hata:", err);
    showToast("Hizmetler çekilemedi!");
  }
}

// --- KULLANICILAR TABLOSU ---
async function loadUsersData(type) {
  try {
    const response = await fetch('http://localhost:3000/api/admin/users');
    const result = await response.json();
    
    if (result.success) {
      let users = result.data;
      
      if (type === 'providers') {
        users = users.filter(u => {
          const r = String(u.role || u.userType || u.type || '').trim().toLowerCase();
          return r === 'provider' || r === 'hizmetveren' || r === 'usta';
        });
      } else if (type === 'customers') {
        users = users.filter(u => {
          const r = String(u.role || u.userType || u.type || '').trim().toLowerCase();
          return r === 'customer' || r === 'hizmetalan' || r === 'user' || r === 'musteri';
        });
      }

      const genericPage = document.getElementById('genericPage');
      if (!genericPage) return;

      let titleText = 'Tüm Kullanıcılar Listesi';
      if (type === 'providers') titleText = 'Hizmet Verenler Listesi';
      else if (type === 'customers') titleText = 'Hizmet Alanlar Listesi';

      let htmlContent = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 22px; font-weight: 700; color: #111; margin: 0;">${titleText}</h2>
          </div>
          <span style="background: #eef2ff; color: #4f46e5; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;">Toplam ${users.length} Kayıt</span>
        </div>

        <div style="background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); overflow: hidden;">
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid #f3f4f6; color: #6b7280; font-size: 13px; background: #f9fafb;">
                  <th style="padding: 14px 16px;">Ad Soyad / Kullanıcı</th>
                  <th style="padding: 14px 16px;">E-posta</th>
                  <th style="padding: 14px 16px;">Rol</th>
                  <th style="padding: 14px 16px;">Kayıt Tarihi</th>
                </tr>
              </thead>
              <tbody>`;

      if (users.length === 0) {
        htmlContent += `<tr><td colspan="4" style="padding: 40px; text-align: center; color: #9ca3af; font-size: 14px;">Bu kategoride henüz kayıt bulunmuyor.</td></tr>`;
      } else {
        users.forEach(user => {
          const userName = user.name || user.fullName || user.username || 'İsimsiz';
          const userEmail = user.email || user.mail || '-';
          const userRole = user.role || user.userType || 'user';
          const userDate = user.createdAt || user.date;

          htmlContent += `<tr style="border-bottom: 1px solid #f9fafb;">
            <td style="padding: 14px 16px; color: #111827; font-weight: 500; font-size: 14px;">${userName}</td>
            <td style="padding: 14px 16px; color: #4b5563; font-size: 14px;">${userEmail}</td>
            <td style="padding: 14px 16px;"><span style="background: #eef2ff; color: #4f46e5; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">${userRole}</span></td>
            <td style="padding: 14px 16px; color: #6b7280; font-size: 14px;">${userDate ? new Date(userDate).toLocaleDateString('tr-TR') : '-'}</td>
          </tr>`;
        });
      }

      htmlContent += `</tbody></table></div></div>`;
      genericPage.innerHTML = htmlContent;
      showToast(`${users.length} adet kayıt listelendi.`);
    }
  } catch (err) {
    console.error("Kullanıcılar yüklenirken hata:", err);
    showToast("Veriler çekilemedi!");
  }
}

// --- ÖDEMELER & HAVUZ TABLOSU ---
async function loadPaymentsData() {
  try {
    const response = await fetch('http://localhost:3000/api/admin/payments');
    const result = await response.json();
    
    if (result.success || Array.isArray(result.data)) {
      const payments = result.data || result || [];
      const genericPage = document.getElementById('genericPage');
      if (!genericPage) return;

      let htmlContent = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 22px; font-weight: 700; color: #111; margin: 0;">Ödemeler & Havuz İşlemleri</h2>
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">Güvenli havuzda gerçekleşen transferler, ödeme saatleri ve kişi bilgileri.</p>
          </div>
          <span style="background: #eef2ff; color: #4f46e5; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;">Toplam ${payments.length} Ödeme</span>
        </div>

        <div style="background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); overflow: hidden;">
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid #f3f4f6; color: #6b7280; font-size: 13px; background: #f9fafb;">
                  <th style="padding: 14px 16px;">İşlemi Yapan / Kişi</th>
                  <th style="padding: 14px 16px;">Hizmet / İlan Başlığı</th>
                  <th style="padding: 14px 16px;">Tutar</th>
                  <th style="padding: 14px 16px;">Ödeme Tarihi & Saat</th>
                  <th style="padding: 14px 16px;">Durum</th>
                </tr>
              </thead>
              <tbody>`;

      if (payments.length === 0) {
        htmlContent += `<tr><td colspan="5" style="padding: 40px; text-align: center; color: #9ca3af; font-size: 14px;">Henüz gerçekleşen bir ödeme bulunmuyor.</td></tr>`;
      } else {
        payments.forEach(item => {
          const person = item.customerName || item.user?.name || item.userName || 'Bilinmiyor';
          const title = item.title || item.name || 'Hizmet Bedeli';
          const price = item.fixedPrice || item.price || item.tutar || 1500;
          const dateVal = item.createdAt || item.date;
          const formattedDate = dateVal ? new Date(dateVal).toLocaleString('tr-TR') : '-';

          htmlContent += `<tr style="border-bottom: 1px solid #f9fafb;">
            <td style="padding: 14px 16px; color: #111827; font-weight: 500; font-size: 14px;">${person}</td>
            <td style="padding: 14px 16px; color: #4b5563; font-size: 14px;">${title}</td>
            <td style="padding: 14px 16px; color: #16a34a; font-weight: 600; font-size: 14px;">₺${Number(price).toLocaleString('tr-TR')}</td>
            <td style="padding: 14px 16px; color: #4b5563; font-size: 14px;">${formattedDate}</td>
            <td style="padding: 14px 16px;"><span style="background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">Başarılı</span></td>
          </tr>`;
        });
      }

      htmlContent += `</tbody></table></div></div>`;
      genericPage.innerHTML = htmlContent;
      showToast(`${payments.length} adet ödeme kaydı listelendi.`);
    }
  } catch (err) {
    console.error("Ödemeler yüklenirken hata:", err);
    showToast("Ödemeler çekilemedi!");
  }
}
document.querySelector('#genericPage .welcome button.primary').style.display = 'none';
const navItems = document.querySelectorAll('.nav-item');
const dashboardPage = document.getElementById('dashboardPage');
const genericPage = document.getElementById('genericPage');
const pageTitle = document.getElementById('pageTitle');
const genericTitle = document.getElementById('genericTitle');
const genericHeading = document.getElementById('genericHeading');
const genericDesc = document.getElementById('genericDesc');
const toast = document.getElementById('toast');

const pageData = {
  dashboard: ['Dashboard', 'Platformun bugünkü durumuna genel bakış.'],
  users: ['Kullanıcılar', 'Müşteri kayıtları, hesap yönetimi ve güvenli erişim.'],
  providers: ['Hizmet Verenler', 'Usta başvuruları, uzmanlık alanları ve performans.'],
  customers: ['Hizmet Alanlar', 'Sistem üzerinden hizmet talep eden kullanıcılar.'],
  services: ['Hizmetler', 'Sistemdeki iş ilanları, kimin açtığı ve işin durumları.'],
  payments: ['Ödemeler & Havuz', 'Güvenli havuzda gerçekleşen transferler, ödeme saatleri ve kişi bilgileri.'],
  reviews: ['Yorumlar & Puanlar', 'Müşterilerin ustalar ve hizmetler için yaptığı değerlendirmeler.'],
 banners: ['Banner Yönetimi', 'Platform içerisindeki duyuru ve kampanya banner görsel yönetimi.'],
  settings: ['Ayarlar', 'Sistem genel yapılandırma ve yönetim ayarları.'],
  logs: ['Sistem Logları', 'Yönetici ve kullanıcı hareketlerinin kayıtları, IP ve konum bilgileri.']
};

function showToast(text = 'İşlem başarıyla gerçekleştirildi.') {
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

// Menü geçişleri
navItems.forEach(item => {
  item.addEventListener('click', async (e) => {
    e.preventDefault();
    
    navItems.forEach(x => x.classList.remove('active'));
    item.classList.add('active');
    
    const page = (item.getAttribute('data-page') || '').trim().toLowerCase();
    const menuText = item.textContent.trim().toLowerCase();
    
    if (pageTitle) pageTitle.textContent = item.textContent.trim().replace(/[0-9]/g, '').trim();

    if (!dashboardPage || !genericPage) return;

    if (page === 'dashboard') {
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
      
      if (page === 'users' || menuText.includes('kullanıcılar')) {
        await loadUsersData('all');
      } else if (page === 'providers' || menuText.includes('hizmet verenler')) {
        await loadUsersData('providers');
      } else if (page === 'logs' || menuText.includes('log')) {
        await loadLogsData(); 
      } else if (page === 'customers' || menuText.includes('hizmet alanlar')) {
        await loadUsersData('customers');
      } else if (page === 'services' || menuText.includes('hizmetler')) {
        await loadServicesData(); 
      } else if (page === 'payments' || menuText === 'ödemeler') {
        await loadPaymentsData();
      } else if (page === 'banners' || menuText.includes('banner')) {
        await loadBannersData();
      } else if (page === 'categories' || menuText === 'kategoriler') {
        await loadCategoriesData();
      
      } else {
        genericPage.querySelector('.panel').innerHTML = `
          <div class="empty-state">
            <div>◈</div>
            <h2>${data[0]} Modülü</h2>
            <p>${data[1]}</p>
            <button class="primary" onclick="location.reload()">Dashboard'a Dön</button>
          </div>`;
      }
    }
  

    
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  });
});

async function fetchDashboardStats() {
  try {
    const response = await fetch('https://bg-backend-2.onrender.com/api/admin/stats');
    const data = await response.json();
    if (data.success && data.stats) {
      const statCards = document.querySelectorAll('.stat-card');
      if (statCards.length >= 5) {
        statCards[0].querySelector('strong').textContent = data.stats.totalUsers;    
        statCards[1].querySelector('strong').textContent = data.stats.totalProviders; 
        statCards[2].querySelector('strong').textContent = data.stats.totalCustomers; 
        statCards[3].querySelector('strong').textContent = data.stats.totalJobs;      
        statCards[4].querySelector('strong').textContent = "₺" + data.stats.totalRevenue.toLocaleString('tr-TR'); 
        document.getElementById('totalCommissionText').textContent = "₺" + data.stats.totalCommission.toLocaleString('tr-TR');
        document.getElementById('totalExpenseText').textContent = "₺" + data.stats.totalExpense.toLocaleString('tr-TR');
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
async function loadLogsData() {
  try {
    const response = await fetch('https://bg-backend-2.onrender.com/api/admin/Logs');
    const result = await response.json();

    if (result.success) {
      const logs = result.data || [];
      const genericPage = document.getElementById('genericPage');
      if (!genericPage) return;

      let htmlContent = `
        <div class="welcome">
          <div>
            <h1>Sistem Logları & Güvenlik</h1>
            <p>Kullanıcıların sisteme giriş yaptığı cihaz IP adresleri ve coğrafi konum bilgileri.</p>
          </div>
          <span style="background: #eef2ff; color: #4f46e5; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;">Toplam ${logs.length} Log Kaydı</span>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3>Erişim Logları</h3>
            <div class="filters"><input placeholder="Filtrele..." /><button class="ghost">Filtrele</button></div>
          </div>
          <div class="table-wrap">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid #f3f4f6; color: #6b7280; font-size: 13px; background: #f9fafb;">
                  <th style="padding: 14px 16px;">Kullanıcı / Ad Soyad</th>
                  <th style="padding: 14px 16px;">Rol</th>
                  <th style="padding: 14px 16px;">IP Adresi</th>
                  <th style="padding: 14px 16px;">Konum (İl / İlçe)</th>
                  <th style="padding: 14px 16px;">İşlem / Durum</th>
                  <th style="padding: 14px 16px;">Tarih & Saat</th>
                </tr>
              </thead>
              <tbody>`;

      if (logs.length === 0) {
        htmlContent += `<tr><td colspan="6" style="padding: 40px; text-align: center; color: #9ca3af; font-size: 14px;">Henüz kaydedilmiş bir log bulunmuyor.</td></tr>`;
      } else {
        logs.forEach(log => {
          const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleString('tr-TR') : '-';
          htmlContent += `<tr style="border-bottom: 1px solid #f9fafb;">
            <td style="padding: 14px 16px; font-weight: 500; color: #111827;">${log.userName || 'Bilinmiyor'}</td>
            <td style="padding: 14px 16px;"><span class="badge info">${log.userRole || 'user'}</span></td>
            <td style="padding: 14px 16px; font-family: monospace; color: #4f46e5; font-weight: 600;">${log.ipAddress || '-'}</td>
            <td style="padding: 14px 16px; color: #16a34a; font-weight: 500;">📍 ${log.location || 'Konum Belirsiz'}</td>
            <td style="padding: 14px 16px; color: #4b5563; font-size: 13px;">${log.action || 'Giriş'}</td>
            <td style="padding: 14px 16px; color: #6b7280; font-size: 13px;">${dateStr}</td>
          </tr>`;
        });
      }

      htmlContent += `</tbody></table></div></div>`;
      genericPage.innerHTML = htmlContent;
      showToast(`${logs.length} adet güvenlik logu yüklendi.`);
    }
  } catch (err) {
    console.error("Loglar yüklenirken hata:", err);
    showToast("Sistem logları çekilemedi!");
  }
}

// --- ÖDEMELER & HAVUZ TABLOSU ---
async function loadCategoriesData() {
  const genericPage = document.getElementById('genericPage');
  if (!genericPage) return;
  genericPage.classList.remove('hidden');

  const dashboardPage = document.getElementById('dashboardPage');
  if (dashboardPage) dashboardPage.classList.add('hidden');

  const title = document.getElementById('genericTitle');
  if (title) title.textContent = 'Kategori & Meslek Yönetimi';

  const desc = document.getElementById('genericDesc');
  if (desc) desc.textContent = 'Uygulamada görünecek ana kategorileri ve alt meslekleri buradan yönetebilirsiniz.';

  const heading = document.getElementById('genericHeading');
  if (heading) heading.textContent = 'Mevcut Kategoriler';
  
  // Üst kısımdaki genel "Yeni Kayıt" butonunu bu sayfada gösterelim veya gizleyelim (isteğe bağlı)
  const topNewBtn = document.querySelector('#genericPage .welcome button.primary');
  if (topNewBtn) topNewBtn.style.display = 'inline-block'; // İstersen 'none' yapabilirsin

  const panelContent = genericPage.querySelector('.panel');
  if (panelContent) {
    panelContent.innerHTML = `
      <div class="panel-head">
        <h3>Kategori Listesi</h3>
        <button class="primary" onclick="addNewCategoryPrompt()">＋ Yeni Kategori Ekle</button>
      </div>
      <div style="padding: 20px;">
        <p style="color: #64748b; margin-bottom: 15px;">Uygulama içerisindeki hizmet kategorileri ve altındaki meslek seçimleri aşağıda listelenmektedir.</p>
        <div id="categoriesListContainer">
          <p style="color: #64748b;">Yükleniyor...</p>
        </div>
      </div>
    `;
  }
  
  // Eğer fetchCategories fonksiyonun tanımlıysa çağır
  if (typeof fetchCategories === 'function') {
    fetchCategories();
  }
}

let allPaymentSummaries = [];

async function fetchPaymentsSummary() {
  try {
    const response = await fetch('https://bg-backend-2.onrender.com/api/admin/payments-summary');
    const result = await response.json();
    if (result.success) {
      allPaymentSummaries = result.data;
      renderPaymentsList(allPaymentSummaries);
    } else {
      document.getElementById('paymentsListContainer').innerHTML = '<p style="color: red;">Ödemeler yüklenemedi.</p>';
    }
  } catch (err) {
    console.error('Ödemeler çekilirken hata:', err);
  }
}

function renderPaymentsList(list) {
  const container = document.getElementById('paymentsListContainer');
  if (!list || list.length === 0) {
    container.innerHTML = '<p style="color: #64748b;">Hiç ödeme kaydı bulunmuyor.</p>';
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; text-align: left;">
      <thead>
        <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 13px;">
          <th style="padding: 12px;">Müşteri / Profil</th>
          <th style="padding: 12px;">Telefon</th>
          <th style="padding: 12px;">Toplam İş Sayısı</th>
          <th style="padding: 12px;">Toplam Harcama</th>
          <th style="padding: 12px; text-align: right;">İşlem</th>
        </tr>
      </thead>
      <tbody>
        ${list.map((item, index) => `
          <tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'" onclick='openCustomerPaymentDetail(${JSON.stringify(item)})'>
            <td style="padding: 12px; font-weight: bold; color: #1e293b;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 36px; height: 36px; background: #e0e7ff; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                  ${item.customerName.substring(0, 2).toUpperCase()}
                </div>
                <div>${item.customerName}</div>
              </div>
            </td>
            <td style="padding: 12px; color: #64748b;">${item.phoneNumber}</td>
            <td style="padding: 12px;"><span style="background: #e0e7ff; color: #4f46e5; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">${item.jobCount} İş</span></td>
            <td style="padding: 12px; font-weight: bold; color: #10b981; font-size: 15px;">₺${item.totalAmount.toLocaleString('tr-TR')}</td>
            <td style="padding: 12px; text-align: right;">
              <button class="ghost" style="padding: 6px 12px; font-size: 12px;">Detayları Gör →</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table >
  `;
}

function filterPayments() {
  const query = document.getElementById('paymentSearch').value.toLowerCase();
  const filtered = allPaymentSummaries.filter(item => item.customerName.toLowerCase().includes(query));
  renderPaymentsList(filtered);
}

function openCustomerPaymentDetail(customerData) {
  // Detayları gösterecek şık bir modal oluşturalım
  const modalId = 'customerDetailModal';
  let existingModal = document.getElementById(modalId);
  if (existingModal) existingModal.remove();

  const modalHtml = `
    <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div style="background: white; width: 600px; max-height: 80vh; border-radius: 16px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); display: flex; flexDirection: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h2 style="margin: 0; font-size: 18px; color: #1e293b;">${customerData.customerName} - Ödeme Detayları</h2>
            <small style="color: #64748b;">Toplam Harcama: <strong style="color: #10b981;">₺${customerData.totalAmount.toLocaleString('tr-TR')}</strong></small>
          </div>
          <button onclick="document.getElementById('${modalId}').remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">✕</button>
        </div>
        <div style="overflow-y: auto; max-height: 50vh;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b;">
                <th style="padding: 8px;">Hizmet / Başlık</th>
                <th style="padding: 8px;">Kategori</th>
                <th style="padding: 8px;">Tarih</th>
                <th style="padding: 8px; text-align: right;">Tutar</th>
              </tr>
            </thead>
            <tbody>
              ${customerData.transactions.map(tx => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px; font-weight: 500;">${tx.title}</td>
                  <td style="padding: 10px; color: #64748b;">${tx.subCategory}</td>
                  <td style="padding: 10px; color: #64748b;">${tx.date}</td>
                  <td style="padding: 10px; text-align: right; font-weight: bold; color: #10b981;">₺${tx.amount.toLocaleString('tr-TR')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top: 20px; text-align: right;">
          <button onclick="document.getElementById('${modalId}').remove()" class="primary" style="padding: 8px 16px; border-radius: 8px; background: #4f46e5; color: white; border: none; cursor: pointer;">Kapat</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function loadCategoriesData() {
  const genericPage = document.getElementById('genericPage');
  genericPage.classList.remove('hidden');
  
  // Dashboard sayfasını gizle, generic sayfayı göster
  const dashboardPage = document.getElementById('dashboardPage');
  if (dashboardPage) dashboardPage.classList.add('hidden');

  document.getElementById('genericTitle').textContent = 'Kategori & Meslek Yönetimi';
  document.getElementById('genericDesc').textContent = 'Uygulamada görünecek ana kategorileri ve alt meslekleri buradan yönetebilirsiniz.';
  
  const heading = document.getElementById('genericHeading');
  if (heading) heading.textContent = 'Mevcut Kategoriler';
  
  const topNewBtn = document.querySelector('#genericPage .welcome button.primary');
  if (topNewBtn) topNewBtn.style.display = 'none';

  const panelContent = genericPage.querySelector('.panel');
  if (panelContent) {
    panelContent.innerHTML = `
      <div class="panel-head">
        <h3>Kategori Listesi</h3>
        <button class="primary" onclick="addNewCategoryPrompt()">＋ Yeni Kategori Ekle</button>
      </div>
      <div style="padding: 20px;">
        <p style="color: #64748b; margin-bottom: 15px;">Uygulama içerisindeki hizmet kategorileri ve altındaki meslek seçimleri aşağıda listelenmektedir.</p>
        <div id="categoriesListContainer">
          <p style="color: #64748b;">Yükleniyor...</p>
        </div>
      </div>
    `;
  }
  
  fetchCategories();
}

async function fetchCategories() {
  try {
    const response = await fetch('https://bg-backend-2.onrender.com/api/admin/categories');
    const result = await response.json();
    const container = document.getElementById('categoriesListContainer');
    
    if (result.success && result.data && result.data.length > 0) {
      container.innerHTML = result.data.map(cat => `
        <div style="display: flex; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; align-items: center; border: 1px solid #e2e8f0;">
          <div>
            <strong>${cat.name}</strong>
            <small style="display: block; color: #94a3b8; margin-top: 2px;">Alt Meslekler: ${Array.isArray(cat.subCategories) ? cat.subCategories.join(', ') : (cat.subCategories || '-')}</small>
          </div>
          <button onclick="deleteCategory('${cat._id}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Kaldır</button>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p style="color: #64748b;">Henüz kayıtlı kategori bulunmuyor.</p>';
    }
  } catch (err) {
    console.error('Kategoriler yüklenirken hata:', err);
  }
}

async function addNewCategoryPrompt() {
  const name = prompt("Ana kategori adını girin (Örn: Temizlik):");
  if (!name) return;
  
  const subCategoriesStr = prompt("Alt meslekleri virgülle ayırarak girin (Örn: Ev Temizliği, Ofis Temizliği):");
  const subCategories = subCategoriesStr ? subCategoriesStr.split(',').map(s => s.trim()) : [];

  try {
    const response = await fetch('https://bg-backend-2.onrender.com/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subCategories })
    });
    const result = await response.json();
    if (result.success) {
      alert('Kategori başarıyla eklendi!');
      fetchCategories();
    } else {
      alert('Hata: ' + result.message);
    }
  } catch (err) {
    console.error('Kategori ekleme hatası:', err);
  }
}

async function deleteCategory(id) {
  if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
  try {
    const response = await fetch(`https://bg-backend-2.onrender.com/api/admin/categories/${id}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (result.success) {
      fetchCategories();
    } else {
      alert('Silinemedi: ' + result.message);
    }
  } catch (err) {
    console.error('Silme hatası:', err);
  }
}

// --- YORUMLAR & PUANLAR TABLOSU ---
async function loadReviewsData() {
  try {
    const response = await fetch('https://bg-backend-2.onrender.com/api/admin/reviews');
    const result = await response.json();
    
    if (result.success || Array.isArray(result.data)) {
      const reviews = result.data || result || [];
      const genericPage = document.getElementById('genericPage');
      if (!genericPage) return;

      let htmlContent = `
        <div class="welcome">
          <div>
            <h1>Yorumlar & Puanlar</h1>
            <p>Müşterilerin hizmetler ve ustalar için yaptığı değerlendirmeler.</p>
          </div>
          <span style="background: #eef2ff; color: #4f46e5; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;">Toplam ${reviews.length} Değerlendirme</span>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3>Değerlendirme Listesi</h3>
            <div class="filters"><input placeholder="Filtrele..." /><button class="ghost">Filtrele</button></div>
          </div>
          <div class="table-wrap">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid #f3f4f6; color: #6b7280; font-size: 13px; background: #f9fafb;">
                  <th style="padding: 14px 16px;">Müşteri</th>
                  <th style="padding: 14px 16px;">Hizmet / İlan</th>
                  <th style="padding: 14px 16px;">Üstlenen Usta</th>
                  <th style="padding: 14px 16px;">Puan</th>
                  <th style="padding: 14px 16px;">Yorum</th>
                  <th style="padding: 14px 16px;">Tarih</th>
                </tr>
              </thead>
              <tbody>`;

      if (reviews.length === 0) {
        htmlContent += `<tr><td colspan="6" style="padding: 40px; text-align: center; color: #9ca3af; font-size: 14px;">Henüz yapılmış bir değerlendirme bulunmuyor.</td></tr>`;
      } else {
        reviews.forEach(item => {
          const customer = item.customerName || item.user?.name || 'Bilinmiyor';
          const title = item.title || item.name || 'Hizmet';
          const provider = item.assignedProviderName || 'Atanmadı';
          const rating = item.rating ? '★ '.repeat(item.rating) + ` (${item.rating}/5)` : 'Puan Yok';
          const comment = item.reviewComment || 'Yorum yazılmamış.';
          const dateVal = item.createdAt || item.date;
          const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('tr-TR') : '-';

          htmlContent += `<tr style="border-bottom: 1px solid #f9fafb;">
            <td style="padding: 14px 16px; color: #111827; font-weight: 500; font-size: 14px;">${customer}</td>
            <td style="padding: 14px 16px; color: #4b5563; font-size: 14px;">${title}</td>
            <td style="padding: 14px 16px; color: #4b5563; font-size: 14px;">${provider}</td>
            <td style="padding: 14px 16px; color: #f59e0b; font-weight: 600; font-size: 14px;">${rating}</td>
            <td style="padding: 14px 16px; color: #4b5563; font-size: 13px; max-width: 250px;" title="${comment}">${comment}</td>
            <td style="padding: 14px 16px; color: #6b7280; font-size: 14px;">${formattedDate}</td>
          </tr>`;
        });
      }

      htmlContent += `</tbody></table></div></div>`;
      genericPage.innerHTML = htmlContent;
      showToast(`${reviews.length} adet değerlendirme listelendi.`);
    }
  } catch (err) {
    console.error("Yorumlar yüklenirken hata:", err);
    showToast("Yorumlar çekilemedi!");
  }
}

// --- HİZMETLER TABLOSU ---
async function loadServicesData() {
  try {
    const response = await fetch('https://bg-backend-2.onrender.com/api/admin/jobs');
    const result = await response.json();
    if (result.success || Array.isArray(result.data)) {
      const jobs = result.data || result || [];
      const genericPage = document.getElementById('genericPage');
      if (!genericPage) return;

      let htmlContent = `
        <div class="welcome">
          <div><h1>Hizmetler ve İlanlar</h1><p>Sistemdeki tüm aktif iş ilanları.</p></div>
          <button class="primary">＋ Yeni Kayıt</button>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>İlan Listesi (${jobs.length})</h3><div class="filters"><input placeholder="Filtrele..." /><button class="ghost">Filtrele</button></div></div>
          <div class="table-wrap">
            <table style="width:100%; border-collapse:collapse; text-align:left;">
              <thead>
                <tr style="border-bottom: 2px solid #f3f4f6; color: #6b7280; font-size: 13px; background: #f9fafb;">
                  <th style="padding:14px;">Müşteri</th>
                  <th style="padding:14px;">Başlık</th>
                  <th style="padding:14px;">Açıklama</th>
                  <th style="padding:14px;">Usta</th>
                  <th style="padding:14px;">Durum</th>
                </tr>
              </thead>
              <tbody>`;

      if (jobs.length === 0) {
        htmlContent += `<tr><td colspan="5" style="padding:30px; text-align:center;">İlan bulunamadı.</td></tr>`;
      } else {
        jobs.forEach(j => {
          htmlContent += `<tr style="border-bottom:1px solid #f9fafb;">
            <td style="padding:14px; font-weight:500;">${j.customerName || 'Bilinmiyor'}</td>
            <td style="padding:14px;">${j.title || 'İsimsiz'}</td>
            <td style="padding:14px; color:#6b7280;">${j.description || '-'}</td>
            <td style="padding:14px;">${j.assignedProviderName || 'Bekliyor'}</td>
            <td style="padding:14px;"><span class="badge info">${j.status || 'Beklemede'}</span></td>
          </tr>`;
        });
      }
      htmlContent += `</tbody></table></div></div>`;
      genericPage.innerHTML = htmlContent;
    }
  } catch (err) {
    showToast("Hizmetler çekilemedi!");
  }
}

// --- KULLANICILAR TABLOSU ---
async function loadUsersData(type) {
  try {
    const response = await fetch('https://bg-backend-2.onrender.com/api/admin/users');
    const result = await response.json();
    if (result.success) {
      let users = result.data;
      if (type === 'providers') {
        users = users.filter(u => ['provider', 'hizmetveren', 'usta'].includes(String(u.role || '').toLowerCase()));
      } else if (type === 'customers') {
        users = users.filter(u => ['customer', 'hizmetalan', 'user', 'musteri'].includes(String(u.role || '').toLowerCase()));
      }

      const genericPage = document.getElementById('genericPage');
      if (!genericPage) return;

      let htmlContent = `
        <div class="welcome">
          <div><h1>Kullanıcı Yönetimi</h1><p>Sisteme kayıtlı kullanıcıların listesi.</p></div>
          <button class="primary">＋ Yeni Kayıt</button>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Toplam ${users.length} Kayıt</h3><div class="filters"><input placeholder="Filtrele..." /><button class="ghost">Filtrele</button></div></div>
          <div class="table-wrap">
            <table style="width:100%; border-collapse:collapse; text-align:left;">
              <thead>
                <tr style="border-bottom: 2px solid #f3f4f6; color: #6b7280; font-size: 13px; background: #f9fafb;">
                  <th style="padding:14px;">Ad Soyad</th>
                  <th style="padding:14px;">E-posta</th>
                  <th style="padding:14px;">Rol</th>
                  <th style="padding:14px;">Kayıt Tarihi</th>
                </tr>
              </thead>
              <tbody>`;

      users.forEach(u => {
        htmlContent += `<tr style="border-bottom:1px solid #f9fafb;">
          <td style="padding:14px; font-weight:500;">${u.name || u.fullName || 'İsimsiz'}</td>
          <td style="padding:14px; color:#6b7280;">${u.email || '-'}</td>
          <td style="padding:14px;"><span class="badge info">${u.role || 'user'}</span></td>
          <td style="padding:14px;">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
        </tr>`;
      });

      htmlContent += `</tbody></table></div></div>`;
      genericPage.innerHTML = htmlContent;
    }
  } catch (err) {
    showToast("Veriler çekilemedi!");
  }
}
// --- BANNER YÖNETİMİ TABLOSU & İŞLEMLERİ ---
async function loadBannersData() {
  try {
    const response = await fetch('https://bg-backend-2.onrender.com/api/admin/banners');
    const result = await response.json();
    
    if (result.success || Array.isArray(result.data)) {
      const banners = result.data || result || [];
      const genericPage = document.getElementById('genericPage');
      if (!genericPage) return;

      let htmlContent = `
        <div class="welcome">
          <div>
            <h1>Banner Yönetimi</h1>
            <p>Platform içerisindeki duyuru ve kampanya görsellerini yönetin.</p>
          </div>
          <button class="primary" onclick="openBannerModal()">＋ Yeni Banner Ekle</button>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3>Banner Listesi (${banners.length})</h3>
            <div class="filters"><input placeholder="Filtrele..." /><button class="ghost">Filtrele</button></div>
          </div>
          <div class="table-wrap">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid #f3f4f6; color: #6b7280; font-size: 13px; background: #f9fafb;">
                  <th style="padding: 14px 16px;">Görsel</th>
                  <th style="padding: 14px 16px;">Başlık</th>
                  <th style="padding: 14px 16px;">Yönlendirme Linki</th>
                  <th style="padding: 14px 16px;">Eklenme Tarihi</th>
                  <th style="padding: 14px 16px;">İşlem</th>
                </tr>
              </thead>
              <tbody>`;

      if (banners.length === 0) {
        htmlContent += `<tr><td colspan="5" style="padding: 40px; text-align: center; color: #9ca3af; font-size: 14px;">Henüz eklenmiş bir banner bulunmuyor.</td></tr>`;
      } else {
        banners.forEach(b => {
          const dateStr = b.createdAt ? new Date(b.createdAt).toLocaleDateString('tr-TR') : '-';
          htmlContent += `<tr style="border-bottom: 1px solid #f9fafb;">
            <td style="padding: 14px 16px;"><img src="${b.imageUrl}" style="width: 80px; height: 40px; object-fit: cover; border-radius: 4px; background: #eee;" onerror="this.src='https://via.placeholder.com/80x40?text=Görsel'" /></td>
            <td style="padding: 14px 16px; font-weight: 500; color: #111827;">${b.title}</td>
            <td style="padding: 14px 16px; color: #4b5563; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${b.link || '-'}</td>
            <td style="padding: 14px 16px; color: #6b7280; font-size: 14px;">${dateStr}</td>
            <td style="padding: 14px 16px;">
              <button onclick="deleteBanner('${b._id}')" style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;">Sil</button>
            </td>
          </tr>`;
        });
      }

      htmlContent += `</tbody></table></div></div>`;
      genericPage.innerHTML = htmlContent;
      showToast(`${banners.length} adet banner listelendi.`);
    }
  } catch (err) {
    console.error("Bannerlar yüklenirken hata:", err);
    showToast("Bannerlar çekilemedi!");
  }
}

// Yeni Banner Ekleme Basit Prompt Örneği (İstersen sonradan modal yapabiliriz)
async function openBannerModal() {
  const title = prompt("Banner Başlığı:");
  if (!title) return;
  const imageUrl = prompt("Banner Görsel URL Adresi:");
  if (!imageUrl) return;
  const link = prompt("Yönlendirme Linki (Opsiyonel):", "#");

  try {
    const response = await fetch('https://bg-backend-2.onrender.com/api/admin/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, imageUrl, link })
    });
    const result = await response.json();
    if (result.success) {
      showToast("Banner başarıyla eklendi!");
      loadBannersData();
    } else {
      showToast("Banner eklenemedi!");
    }
  } catch (e) {
    showToast("Sunucu hatası!");
  }
}

async function deleteBanner(id) {
  if (!confirm("Bu banner'ı silmek istediğinize emin misiniz?")) return;
  try {
    const response = await fetch(`https://bg-backend-2.onrender.com/api/admin/banners/${id}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (result.success) {
      showToast("Banner silindi!");
      loadBannersData();
    } else {
      showToast("Silinemedi!");
    }
  } catch (e) {
    showToast("Bağlantı hatası!");
  }
}
// --- KATEGORİLER SAYFASI YÖNETİCİSİ ---
async function loadCategoriesData() {
  const genericPage = document.getElementById('genericPage');
  if (!genericPage) return;
  genericPage.classList.remove('hidden');

  const dashboardPage = document.getElementById('dashboardPage');
  if (dashboardPage) dashboardPage.classList.add('hidden');

  const title = document.getElementById('genericTitle');
  if (title) title.textContent = 'Kategori & Meslek Yönetimi';

  const desc = document.getElementById('genericDesc');
  if (desc) desc.textContent = 'Uygulamada görünecek ana kategorileri ve alt meslekleri buradan yönetebilirsiniz.';

  const heading = document.getElementById('genericHeading');
  if (heading) heading.textContent = 'Mevcut Kategoriler';
  
  const topNewBtn = document.querySelector('#genericPage .welcome button.primary');
  if (topNewBtn) topNewBtn.style.display = 'none';

  const panelContent = genericPage.querySelector('.panel');
  if (panelContent) {
    panelContent.innerHTML = `
      <div class="panel-head">
        <h3>Kategori Listesi</h3>
        <button class="primary" onclick="addNewCategoryPrompt()">＋ Yeni Kategori Ekle</button>
      </div>
      <div style="padding: 20px;">
        <p style="color: #64748b; margin-bottom: 15px;">Uygulama içerisindeki hizmet kategorileri ve altındaki meslek seçimleri aşağıda listelenmektedir.</p>
        <div id="categoriesListContainer">
          <p style="color: #64748b;">Yükleniyor...</p>
        </div>
      </div>
    `;
  }
  
  if (typeof fetchCategories === 'function') {
    fetchCategories();
  }
}

// --- ÖDEMELER SAYFASI YÖNETİCİSİ ---
async function loadPaymentsData() {
  const genericPage = document.getElementById('genericPage');
  if (!genericPage) return;
  genericPage.classList.remove('hidden');
  
  const dashboardPage = document.getElementById('dashboardPage');
  if (dashboardPage) dashboardPage.classList.add('hidden');

  const title = document.getElementById('genericTitle');
  if (title) title.textContent = 'Kişi Bazlı Ödemeler';

  const desc = document.getElementById('genericDesc');
  if (desc) desc.textContent = 'Kullanıcıların toplam harcamaları ve ödeme detayları.';

  const heading = document.getElementById('genericHeading');
  if (heading) heading.textContent = 'Ödeme Yapan Kişiler';
  
  const topNewBtn = document.querySelector('#genericPage .welcome button.primary');
  if (topNewBtn) topNewBtn.style.display = 'none';

  const panelContent = genericPage.querySelector('.panel');
  if (panelContent) {
    panelContent.innerHTML = `
      <div class="panel-head">
        <h3>Kullanıcı Ödeme Özetleri</h3>
        <div class="filters"><input id="paymentSearch" placeholder="Kişi ara..." oninput="filterPayments()" /></div>
      </div>
      <div style="padding: 20px;">
        <div id="paymentsListContainer">
          <p style="color: #64748b;">Yükleniyor...</p>
        </div>
      </div>
    `;
  }

  if (typeof fetchPaymentsSummary === 'function') {
    fetchPaymentsSummary();
  }
}

import React, { useState, useEffect } from 'react';
import '../styles/Promo.css';

/* ── simple in-memory fetch cache (5 min TTL) ─── */
const cache = {};
const CACHE_TTL = 5 * 60 * 1000;

const cachedFetch = async (url) => {
  const now = Date.now();
  const entry = cache[url];
  if (entry && now - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  const res = await fetch(url);
  const data = await res.json();
  cache[url] = { data, timestamp: now };
  return data;
};

const Promo = () => {
  const [promoPage, setPromoPage] = useState(null);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      cachedFetch('/api/promo-page').catch(err => {
        console.error('Error fetching promo page:', err);
        return { success: true, data: null };
      }),
      cachedFetch('/api/promos').catch(err => {
        console.error('Error fetching promos:', err);
        return { success: true, data: [] };
      })
    ]).then(([pageRes, promosRes]) => {
      if (pageRes?.success && pageRes?.data) {
        setPromoPage(pageRes.data);
      }
      if (promosRes?.success && Array.isArray(promosRes?.data)) {
        setPromos(promosRes.data);
      }
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const bannerTitle = promoPage?.title || 'Promo Games: Cashback hingga 90% Buat Top Up Game di RAST';
  const bannerImage = promoPage?.imageUrl || '/asset/gambar_promo/promo_gacor.jpg';
  const periodText = promoPage?.periodText || 'Periode Promo 1-30 Okt 2025';
  const regionText = promoPage?.regionText || 'Seluruh Indonesia';
  const categoryText = promoPage?.categoryText || 'Games';
  const subheadingText = promoPage?.subheading || 'Promo Mobile Legends di RAST Games GRATIS* Weekly Diamond Pass, Weekly Diamond Pass 2x (100% uang kembali), 59 Diamonds (100% uang kembali) S&K Berlaku';

  return (
    <>
      <main className="promo-main">
      <section className="promo-section">
        <div className="promo-bagian-1">
          <h1>{bannerTitle}</h1>
          <div className="promo-img-container">
            <img src={bannerImage} alt="Promo Banner" />
          </div>

          <p className="promo-prd-promo">{periodText}</p>
          <p className="promo-info-promo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
              <path d="M0 188.6C0 84.4 86 0 192 0S384 84.4 384 188.6c0 119.3-120.2 262.3-170.4 316.8-11.8 12.8-31.5 12.8-43.3 0-50.2-54.5-170.4-197.5-170.4-316.8zM192 256a64 64 0 1 0 0-128 64 64 0 1 0 0 128z"/>
            </svg>
            {regionText}
          </p>
          <p className="promo-info-promo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
              <path d="M24-16C10.7-16 0-5.3 0 8S10.7 32 24 32l45.3 0c3.9 0 7.2 2.8 7.9 6.6l52.1 286.3c6.2 34.2 36 59.1 70.8 59.1L456 384c13.3 0 24-10.7 24-24s-10.7-24-24-24l-255.9 0c-11.6 0-21.5-8.3-23.6-19.7l-5.1-28.3 303.6 0c30.8 0 57.2-21.9 62.9-52.2L568.9 69.9C572.6 50.2 557.5 32 537.4 32l-412.7 0-.4-2c-4.8-26.6-28-46-55.1-46L24-16zM208 512a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm224 0a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"/>
            </svg>
            {categoryText}
          </p>
        </div>
        <div className="promo-bagian-2">
          <h2>{subheadingText}</h2>
          <div className="promo-table-container">
            <table>
              <thead>
                <tr>
                  <th>Kategori Promo</th>
                  <th>Game</th>
                  <th>Periode</th>
                  <th>Promo</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.4)' }}>
                      Memuat data promo...
                    </td>
                  </tr>
                ) : promos.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.4)' }}>
                      Belum ada promo aktif saat ini.
                    </td>
                  </tr>
                ) : (
                  promos.map((promo) => (
                    <tr key={promo.id}>
                      <td><span className="text-cyan">{promo.category}</span></td>
                      <td>{promo.gameName}</td>
                      <td>
                        {promo.periodText}
                        {promo.timeText && (
                          <>
                            <br />
                            <small style={{ color: 'rgba(255,255,255,0.5)', display: 'inline-block', marginTop: '4px' }}>
                              {promo.timeText}
                            </small>
                          </>
                        )}
                      </td>
                      <td><span className="text-highlight">{promo.cashbackText}</span></td>
                      <td>
                        {promo.notes === '-' ? (
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>-</span>
                        ) : (
                          <span className={promo.notes.includes('RAST Plus') ? "badge-alert" : ""}>
                            {promo.notes}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <ol className="promo-promo-terms">
            <li>Promo hanya berlaku untuk pengguna yang pertama kali bertransaksi di website RAST Games.</li>
            <li>Promo hanya berlaku di aplikasi RAST.</li>
            <li>Kuota promo terbatas.</li>
            <li>Promo dapat dipakai untuk 1x transaksi/pengguna/periode.</li>
            <li>Promo berlaku untuk transaksi di website RAST Games dengan metode pembayaran RAST & RAST Tabungan by Jago.</li>
            <li>Promo tidak berlaku untuk transaksi menggunakan RAST Coins secara penuh atau sebagian.</li>
            <li>Promo ini tidak dapat digabungkan dengan promo lainnya.</li>
            <li>Cashback akan diterima setelah pengguna klik tombol Pakai Promo ketika berada di halaman checkout.</li>
            <li>Cashback hanya akan diberikan jika pengguna membayar menggunakan saldo RAST.</li>
            <li>RAST berhak mengubah syarat dan ketentuan dan/atau menghentikan promosi tanpa pemberitahuan sebelumnya.</li>
            <li>RAST berhak menahan dan/atau membatalkan promo dan/atau membatasi layanan, baik untuk sementara maupun secara permanen, kepada pengguna sewaktu-waktu termasuk jika ditemukan tindakan penyalahgunaan (abuse), kecurangan (fraud) dan/atau aktivitas mencurigakan lainnya pada akun pengguna.</li>
            <li>RAST memiliki hak untuk menentukan berapa kali kamu bisa mendapat cashback dalam 1 hari.</li>
            <li>Dengan menggunakan promo ini, pengguna dianggap telah mengerti dan menyetujui seluruh syarat dan ketentuan yang berlaku.</li>
          </ol>
        </div>
      </section>
    </main>
    </>
  );
};

export default Promo;
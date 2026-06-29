import { useState } from 'react';
import { getAuthToken } from '../../utils/api';
import { authFormFetch } from '../../utils/adminCache';
import Modal from './Modal';
import Input from './Input';

const emptyPromoForm = { category: '', gameName: '', periodText: '', timeText: '', cashbackText: '', notes: '', isActive: 'true' };
const emptyBannerForm = { title: '', periodText: '', regionText: 'Seluruh Indonesia', categoryText: 'Games', subheading: '', isActive: 'true' };

export default function PromoManager({ promos, banners, showToast, onRefreshPromos, onRefreshBanners, refreshKey, onRefreshComplete }) {
  const [subTab, setSubTab] = useState('rows');

  // Promo row state
  const [modal, setModal] = useState(null);
  const [promoForm, setPromoForm] = useState(emptyPromoForm);
  const [promoEdit, setPromoEdit] = useState(null);

  // Banner state
  const [bannerForm, setBannerForm] = useState(emptyBannerForm);
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerEdit, setBannerEdit] = useState(null);
  const [bannerHasImage, setBannerHasImage] = useState(false);
  const [removeBannerImage, setRemoveBannerImage] = useState(false);

  // ---- Promo CRUD ----
  const handleCreatePromo = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...promoForm, isActive: promoForm.isActive === 'true' })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setPromoForm(emptyPromoForm);
        onRefreshPromos();
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal membuat promo', 'error'); }
  };

  const handleUpdatePromo = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/promos/${promoEdit}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...promoForm, isActive: promoForm.isActive === 'true' })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setPromoForm(emptyPromoForm);
        setPromoEdit(null);
        onRefreshPromos();
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal mengupdate promo', 'error'); }
  };

  const handleDeletePromo = async (id) => {
    if (!confirm('Yakin ingin menghapus promo ini?')) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/promos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) { showToast(json.message); onRefreshPromos(); }
      else showToast(json.message, 'error');
    } catch { showToast('Gagal menghapus promo', 'error'); }
  };

  // ---- Banner CRUD ----
  const handleCreateBanner = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', bannerForm.title);
      fd.append('periodText', bannerForm.periodText);
      fd.append('regionText', bannerForm.regionText);
      fd.append('categoryText', bannerForm.categoryText);
      fd.append('subheading', bannerForm.subheading);
      fd.append('isActive', String(bannerForm.isActive));
      if (bannerImage) fd.append('image', bannerImage);

      const json = await authFormFetch('/api/admin/promo-banners', 'POST', fd);
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setBannerForm(emptyBannerForm);
        setBannerImage(null);
        onRefreshBanners();
        onRefreshComplete?.();
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal membuat banner promo', 'error'); }
  };

  const handleUpdateBanner = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', bannerForm.title);
      fd.append('periodText', bannerForm.periodText);
      fd.append('regionText', bannerForm.regionText);
      fd.append('categoryText', bannerForm.categoryText);
      fd.append('subheading', bannerForm.subheading);
      fd.append('isActive', String(bannerForm.isActive));
      if (bannerImage) fd.append('image', bannerImage);
      if (removeBannerImage) fd.append('removeImage', 'true');

      const json = await authFormFetch(`/api/admin/promo-banners/${bannerEdit}`, 'PUT', fd);
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setBannerForm(emptyBannerForm);
        setBannerImage(null);
        setBannerEdit(null);
        setRemoveBannerImage(false);
        onRefreshBanners();
        onRefreshComplete?.();
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal mengupdate banner promo', 'error'); }
  };

  const handleDeleteBanner = async (id) => {
    if (!confirm('Yakin ingin menghapus banner promo ini?')) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/promo-banners/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) { showToast(json.message); onRefreshBanners(); }
      else showToast(json.message, 'error');
    } catch { showToast('Gagal menghapus banner promo', 'error'); }
  };

  const openBannerEdit = (b) => {
    setBannerForm({
      title: b.title, periodText: b.periodText, regionText: b.regionText,
      categoryText: b.categoryText, subheading: b.subheading, isActive: String(b.isActive)
    });
    setBannerImage(null);
    setBannerEdit(b.id);
    setBannerHasImage(!!b.imageUrl);
    setRemoveBannerImage(false);
    setModal('banner');
  };

  return (
    <section>
      {/* Sub-tab nav */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #2a2a45', paddingBottom: '12px' }}>
        <button className={`admin-btn ${subTab === 'rows' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setSubTab('rows')}>
          Baris Jadwal Promo ({promos.length})
        </button>
        <button className={`admin-btn ${subTab === 'banners' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setSubTab('banners')}>
          Banner & Config Halaman ({banners.length})
        </button>
      </div>

      {subTab === 'rows' && (
        <>
          <div className="admin-section-header">
            <p className="admin-section-desc">Daftar baris jadwal promo di bagian bawah tabel</p>
            <button className="admin-btn admin-btn-primary"
              onClick={() => { setPromoForm(emptyPromoForm); setPromoEdit(null); setModal('promo'); }}>
              + Tambah Baris Promo
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kategori</th><th>Game</th><th>Periode</th><th>Jam</th>
                  <th>Cashback</th><th>Keterangan</th><th>Aktif</th><th style={{ width: 160 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {promos.length === 0 ? (
                  <tr><td colSpan={8} className="admin-empty">Belum ada baris promo</td></tr>
                ) : promos.map(p => (
                  <tr key={p.id}>
                    <td><span className="admin-game-name">{p.category}</span></td>
                    <td>{p.gameName}</td>
                    <td>{p.periodText}</td>
                    <td>{p.timeText || '-'}</td>
                    <td><span className="admin-price">{p.cashbackText}</span></td>
                    <td>{p.notes}</td>
                    <td>{p.isActive ? <span className="admin-category-badge">Aktif</span> : <span style={{ color: '#64748b' }}>Nonaktif</span>}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="admin-btn-sm admin-btn-edit"
                          onClick={() => {
                            setPromoForm({
                              category: p.category, gameName: p.gameName, periodText: p.periodText,
                              timeText: p.timeText || '', cashbackText: p.cashbackText,
                              notes: p.notes || '-', isActive: String(p.isActive)
                            });
                            setPromoEdit(p.id);
                            setModal('promo');
                          }}>Edit</button>
                        <button className="admin-btn-sm admin-btn-delete"
                          onClick={() => handleDeletePromo(p.id)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {subTab === 'banners' && (
        <>
          <div className="admin-section-header">
            <p className="admin-section-desc">Konfigurasi header, deskripsi, dan banner utama halaman Promo</p>
            <button className="admin-btn admin-btn-primary"
              onClick={() => { setBannerForm(emptyBannerForm); setBannerImage(null); setBannerEdit(null); setBannerHasImage(false); setRemoveBannerImage(false); setModal('banner'); }}>
              + Tambah Config Banner
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Judul</th><th>Periode</th><th>Region</th><th>Kategori</th>
                  <th>Subheading</th><th>Banner</th><th>Aktif</th><th style={{ width: 160 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {banners.length === 0 ? (
                  <tr><td colSpan={8} className="admin-empty">Belum ada config banner</td></tr>
                ) : banners.map(b => (
                  <tr key={b.id}>
                    <td><span className="admin-game-name">{b.title}</span></td>
                    <td>{b.periodText}</td>
                    <td>{b.regionText}</td>
                    <td>{b.categoryText}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.subheading}</td>
                    <td><span style={{ color: '#64748b' }}>-</span></td>
                    <td>{b.isActive ? <span className="admin-category-badge">Aktif</span> : <span style={{ color: '#64748b' }}>Nonaktif</span>}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="admin-btn-sm admin-btn-edit" onClick={() => openBannerEdit(b)}>Edit</button>
                        <button className="admin-btn-sm admin-btn-delete" onClick={() => handleDeleteBanner(b.id)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Promo row modal */}
      {modal === 'promo' && (
        <Modal title={promoEdit ? 'Edit Baris Promo' : 'Tambah Baris Promo'} onClose={() => setModal(null)}>
          <form onSubmit={promoEdit ? handleUpdatePromo : handleCreatePromo}>
            <Input label="Kategori Promo" value={promoForm.category}
              onChange={v => setPromoForm(p => ({ ...p, category: v }))} required placeholder="Weekly Diamond Pass" />
            <Input label="Nama Game" value={promoForm.gameName}
              onChange={v => setPromoForm(p => ({ ...p, gameName: v }))} required placeholder="Mobile Legends" />
            <Input label="Periode" value={promoForm.periodText}
              onChange={v => setPromoForm(p => ({ ...p, periodText: v }))} required placeholder="1 Oktober–31 Desember 2025" />
            <Input label="Jam Aktif (Opsional)" value={promoForm.timeText}
              onChange={v => setPromoForm(p => ({ ...p, timeText: v }))} placeholder="(15.00-18.00)" />
            <Input label="Cashback" value={promoForm.cashbackText}
              onChange={v => setPromoForm(p => ({ ...p, cashbackText: v }))} required placeholder="Cashback 100% (maks. Rp27.195)" />
            <Input label="Keterangan" value={promoForm.notes}
              onChange={v => setPromoForm(p => ({ ...p, notes: v }))} placeholder="Promo hanya berlaku untuk pengguna RAST Plus" />
            <div className="admin-field">
              <label>Status</label>
              <select value={promoForm.isActive}
                onChange={e => setPromoForm(p => ({ ...p, isActive: e.target.value }))}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button type="submit" className="admin-btn admin-btn-primary">{promoEdit ? 'Update' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Banner modal */}
      {modal === 'banner' && (
        <Modal title={bannerEdit ? 'Edit Config Banner' : 'Tambah Config Banner'} onClose={() => setModal(null)}>
          <form onSubmit={bannerEdit ? handleUpdateBanner : handleCreateBanner}>
            <Input label="Judul Banner/Page" value={bannerForm.title}
              onChange={v => setBannerForm(p => ({ ...p, title: v }))} required placeholder="Promo Games: Cashback hingga 90%..." />
            <Input label="Periode Promo" value={bannerForm.periodText}
              onChange={v => setBannerForm(p => ({ ...p, periodText: v }))} required placeholder="Periode Promo 1-30 Okt 2025" />
            <Input label="Region" value={bannerForm.regionText}
              onChange={v => setBannerForm(p => ({ ...p, regionText: v }))} required placeholder="Seluruh Indonesia" />
            <Input label="Kategori" value={bannerForm.categoryText}
              onChange={v => setBannerForm(p => ({ ...p, categoryText: v }))} required placeholder="Games" />
            <Input label="Sub-heading (Deskripsi)" value={bannerForm.subheading}
              onChange={v => setBannerForm(p => ({ ...p, subheading: v }))} required placeholder="Promo Mobile Legends di RAST Games GRATIS*..." />
            <div className="admin-field">
              <label>Status</label>
              <select value={bannerForm.isActive}
                onChange={e => setBannerForm(p => ({ ...p, isActive: e.target.value }))}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Gambar Banner Promo</label>
              <div className="admin-file-wrap">
                {bannerHasImage && !bannerImage && !removeBannerImage && (
                  <img src={`/api/promo-media/banner/${bannerEdit}?t=${refreshKey}`} alt="" className="admin-file-preview"
                    style={{ maxHeight: 120 }}
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                {bannerImage && (
                  <img src={URL.createObjectURL(bannerImage)} alt="" className="admin-file-preview"
                    style={{ maxHeight: 120 }} />
                )}
                <div className="admin-file-inputs">
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={e => { setBannerImage(e.target.files?.[0] || null); setRemoveBannerImage(false); }} />
                  {(bannerHasImage || bannerImage) && (
                    <button type="button" className="admin-btn-sm admin-btn-delete"
                      onClick={() => { setBannerImage(null); setBannerHasImage(false); setRemoveBannerImage(true); }}>Hapus</button>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button type="submit" className="admin-btn admin-btn-primary">{bannerEdit ? 'Update' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

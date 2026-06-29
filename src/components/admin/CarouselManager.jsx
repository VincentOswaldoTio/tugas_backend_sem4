import { useState } from 'react';
import { getAuthToken } from '../../utils/api';
import Modal from './Modal';
import Input from './Input';

const emptyForm = { title: '', subtitle: '', cta: '', link: '', sortOrder: '0', isActive: 'true' };

export default function CarouselManager({ slides, showToast, onRefresh }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState(null);
  const [editId, setEditId] = useState(null);
  const [hasImage, setHasImage] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    const token = getAuthToken();
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/admin/carousel-slides/${editId}` : '/api/admin/carousel-slides';
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('subtitle', form.subtitle);
      fd.append('cta', form.cta);
      fd.append('link', form.link);
      fd.append('sortOrder', form.sortOrder);
      fd.append('isActive', form.isActive);
      if (image) fd.append('image', image);
      if (editId && !hasImage && !image) fd.append('removeImage', 'true');

      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(url, { method, headers, body: fd });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setForm(emptyForm);
        setImage(null);
        setEditId(null);
        setHasImage(false);
        onRefresh();
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal menyimpan slide', 'error'); }
  };

  return (
    <section>
      <div className="admin-section-header">
        <p className="admin-section-desc">{slides.length} slide</p>
        <button className="admin-btn admin-btn-primary"
          onClick={() => { setForm(emptyForm); setImage(null); setEditId(null); setHasImage(false); setModal('slide'); }}>
          + Tambah Slide
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Urutan</th><th>Judul</th><th>CTA</th><th>Tautan</th><th>Gambar</th><th>Aktif</th><th style={{ width: 160 }}>Aksi</th></tr>
          </thead>
          <tbody>
            {slides.length === 0 ? (
              <tr><td colSpan={7} className="admin-empty">Belum ada slide</td></tr>
            ) : slides.map(s => (
              <tr key={s.id}>
                <td><span className="admin-badge">{s.sortOrder}</span></td>
                <td><span className="admin-game-name">{s.title}</span></td>
                <td>{s.cta}</td>
                <td><code className="admin-code">{s.link}</code></td>
                <td><span style={{ color: '#64748b' }}>-</span></td>
                <td>{s.isActive ? <span className="admin-category-badge">Aktif</span> : <span style={{ color: '#64748b' }}>Nonaktif</span>}</td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-btn-sm admin-btn-edit"
                      onClick={() => {
                        setForm({ title: s.title, subtitle: s.subtitle || '', cta: s.cta, link: s.link, sortOrder: String(s.sortOrder), isActive: String(s.isActive) });
                        setImage(null);
                        setEditId(s.id);
                        setHasImage(!!s.imageUrl);
                        setModal('slide');
                      }}>Edit</button>
                    <button className="admin-btn-sm admin-btn-delete"
                      onClick={async () => {
                        if (!confirm(`Hapus slide "${s.title}"?`)) return;
                        const token = getAuthToken();
                        await fetch(`/api/admin/carousel-slides/${s.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                        onRefresh();
                      }}>Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'slide' && (
        <Modal title={editId ? 'Edit Slide' : 'Tambah Slide'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave}>
            <Input label="Judul" value={form.title}
              onChange={v => setForm(p => ({ ...p, title: v }))} required placeholder="Top Up Game Terpercaya" />
            <Input label="Subtitle" value={form.subtitle}
              onChange={v => setForm(p => ({ ...p, subtitle: v }))} placeholder="Murah, Cepat, dan Aman..." />
            <Input label="CTA Button" value={form.cta}
              onChange={v => setForm(p => ({ ...p, cta: v }))} required placeholder="Lihat Game" />
            <Input label="Tautan (link)" value={form.link}
              onChange={v => setForm(p => ({ ...p, link: v }))} required placeholder="#all-games" />
            <Input label="Urutan" type="number" value={form.sortOrder}
              onChange={v => setForm(p => ({ ...p, sortOrder: v }))} placeholder="0" />
            <div className="admin-field">
              <label>Status</label>
              <select value={form.isActive}
                onChange={e => setForm(p => ({ ...p, isActive: e.target.value }))}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Gambar Slide</label>
              <div className="admin-file-wrap">
                {hasImage && !image && (
                  <img src={`/api/carousel-media/${editId}`} alt="" className="admin-file-preview"
                    style={{ maxHeight: 120 }}
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                {image && (
                  <img src={URL.createObjectURL(image)} alt="" className="admin-file-preview"
                    style={{ maxHeight: 120 }} />
                )}
                <div className="admin-file-inputs">
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={e => setImage(e.target.files?.[0] || null)} />
                  {(hasImage || image) && (
                    <button type="button" className="admin-btn-sm admin-btn-delete"
                      onClick={() => { setImage(null); setHasImage(false); }}>Hapus</button>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button type="submit" className="admin-btn admin-btn-primary">{editId ? 'Update' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

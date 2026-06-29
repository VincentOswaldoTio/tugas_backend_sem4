import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../../utils/api';
import { authFormFetch } from '../../utils/adminCache';
import Modal from './Modal';
import Input from './Input';
import FileInput from './FileInput';

const emptyGameForm = { name: '', slug: '', bgPosition: '', hasZone: true, badge: '', categoryId: '', zoneOptions: '' };
const emptyItemForm = { qty: '', itemName: '', originalPrice: '', discountPercent: '0' };

export default function GameManager({ games, categories, showToast, onRefresh, refreshKey, activeTab, onRefreshComplete }) {
  const [modal, setModal] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameItems, setGameItems] = useState([]);
  const [gameForm, setGameForm] = useState(emptyGameForm);
  const [gameFiles, setGameFiles] = useState({ logo: null, bg: null, itemIcon: null });
  const [removeImages, setRemoveImages] = useState({ logo: false, bg: false, itemIcon: false });
  const [editTarget, setEditTarget] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const formatPrice = (p) => new Intl.NumberFormat('id-ID').format(p || 0);
  const activeGame = games.find(g => g.id === selectedGame);

  const resetGameForm = () => {
    setGameForm(emptyGameForm);
    setGameFiles({ logo: null, bg: null, itemIcon: null });
    setRemoveImages({ logo: false, bg: false, itemIcon: false });
    setEditTarget(null);
  };

  const buildGameFormData = () => {
    const fd = new FormData();
    fd.append('name', gameForm.name);
    fd.append('slug', gameForm.slug);
    fd.append('hasZone', String(gameForm.hasZone));
    if (gameForm.bgPosition) fd.append('bgPosition', gameForm.bgPosition);
    if (gameFiles.logo) fd.append('logo', gameFiles.logo);
    if (gameFiles.bg) fd.append('bg', gameFiles.bg);
    if (gameFiles.itemIcon) fd.append('itemIcon', gameFiles.itemIcon);
    fd.append('badge', gameForm.badge);
    fd.append('categoryId', gameForm.categoryId);
    fd.append('zoneOptions', JSON.stringify(gameForm.zoneOptions ? gameForm.zoneOptions.split(',').map(s => s.trim()).filter(Boolean) : []));
    if (removeImages.logo) fd.append('removeLogo', 'true');
    if (removeImages.bg) fd.append('removeBg', 'true');
    if (removeImages.itemIcon) fd.append('removeIcon', 'true');
    return fd;
  };

  // ---- loadItems ----
  const loadItems = useCallback(async (gameId) => {
    if (!gameId) { setGameItems([]); return; }
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/games/${gameId}/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setGameItems(json.data.items);
    } catch { showToast('Gagal memuat items', 'error'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedGame) loadItems(selectedGame);
      else setGameItems([]);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedGame, loadItems]);

  // ---- Game CRUD ----
  const handleCreateGame = async (e) => {
    e.preventDefault();
    try {
      const json = await authFormFetch('/api/admin/games', 'POST', buildGameFormData());
      if (json.success) {
        showToast(json.message);
        setModal(null);
        resetGameForm();
        onRefresh();
        onRefreshComplete?.();
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal membuat game', 'error'); }
  };

  const handleUpdateGame = async (e) => {
    e.preventDefault();
    try {
      const json = await authFormFetch(`/api/admin/games/${editTarget}`, 'PUT', buildGameFormData());
      if (json.success) {
        showToast(json.message);
        setModal(null);
        resetGameForm();
        onRefresh();
        onRefreshComplete?.();
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal mengupdate game', 'error'); }
  };

  const handleDeleteGame = async (id) => {
    if (!confirm('Yakin ingin menghapus game ini?')) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/games/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) { showToast(json.message); onRefresh(); onRefreshComplete?.(); }
      else showToast(json.message, 'error');
    } catch { showToast('Gagal menghapus game', 'error'); }
  };

  const openEditGame = async (id) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/games/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        const g = json.data;
        setGameForm({
          name: g.name || '', slug: g.slug || '',
          bgPosition: g.bgPosition || '', hasZone: g.hasZone !== false,
          badge: g.badge || '', categoryId: g.categoryId || '',
          zoneOptions: Array.isArray(g.zoneOptions) ? g.zoneOptions.join(', ') : ''
        });
        setGameFiles({ logo: null, bg: null, itemIcon: null });
        setRemoveImages({ logo: false, bg: false, itemIcon: false });
        setEditTarget(id);
        setModal('editGame');
      }
    } catch { showToast('Gagal memuat data game', 'error'); }
  };

  // ---- Item CRUD ----
  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/games/${selectedGame}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...itemForm, qty: Number(itemForm.qty), originalPrice: Number(itemForm.originalPrice), discountPercent: Number(itemForm.discountPercent) })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setItemForm(emptyItemForm);
        loadItems(selectedGame);
        onRefresh();
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal menambah item', 'error'); }
  };

  const openEditItem = (item) => {
    setItemForm({
      qty: String(item.qty), itemName: item.itemName,
      originalPrice: String(item.originalPrice), discountPercent: String(item.discountPercent)
    });
    setEditTarget(item.itemName);
    setModal('editItem');
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/games/${selectedGame}/items/${encodeURIComponent(editTarget)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...itemForm, qty: Number(itemForm.qty), originalPrice: Number(itemForm.originalPrice), discountPercent: Number(itemForm.discountPercent) })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setItemForm(emptyItemForm);
        setEditTarget(null);
        loadItems(selectedGame);
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal mengupdate item', 'error'); }
  };

  const handleDeleteItem = async (itemName) => {
    if (!confirm(`Yakin ingin menghapus item "${itemName}"?`)) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/games/${selectedGame}/items/${encodeURIComponent(itemName)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) { showToast(json.message); loadItems(selectedGame); onRefresh(); }
      else showToast(json.message, 'error');
    } catch { showToast('Gagal menghapus item', 'error'); }
  };

  // Don't render for non-games/items tabs
  if (activeTab !== 'games' && activeTab !== 'items') return null;

  return (
    <>
      {activeTab === 'games' && (
        <section>
          <div className="admin-section-header">
            <p className="admin-section-desc">{games.length} game terdaftar</p>
            <button className="admin-btn admin-btn-primary" onClick={() => { resetGameForm(); setModal('addGame'); }}>
              + Tambah Game
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama</th><th>Slug</th><th>Category</th><th>Badge</th>
                  <th>Items</th><th>Logo</th><th style={{ width: 160 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {games.length === 0 ? (
                  <tr><td colSpan={7} className="admin-empty">Belum ada game</td></tr>
                ) : games.map(g => (
                  <tr key={g.id}>
                    <td><span className="admin-game-name">{g.name}</span></td>
                    <td><code className="admin-code">{g.slug}</code></td>
                    <td>{g.category ? <span className="admin-category-badge">{g.category.name}</span> : '-'}</td>
                    <td>{g.badge ? <span className="admin-badge-badge" data-badge={g.badge}>{g.badge}</span> : '-'}</td>
                    <td><span className="admin-badge">{g.itemCount}</span></td>
                    <td>
                      <img src={`/api/game-media/${g.id}/logo?t=${refreshKey}`} alt="" className="admin-thumb"
                        onError={e => { e.target.style.display = 'none'; }} />
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button className="admin-btn-sm admin-btn-edit" onClick={() => openEditGame(g.id)}>Edit</button>
                        <button className="admin-btn-sm admin-btn-delete" onClick={() => handleDeleteGame(g.id)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'items' && (
        <section>
          <div className="admin-section-header">
            <p className="admin-section-desc">Kelola item top-up per game</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select className="admin-select" value={selectedGame || ''}
                onChange={e => setSelectedGame(e.target.value)}>
                <option value="">Pilih Game</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.name} ({g.itemCount} items)</option>)}
              </select>
              {selectedGame && (
                <button className="admin-btn admin-btn-primary"
                  onClick={() => { setItemForm(emptyItemForm); setEditTarget(null); setModal('addItem'); }}>
                  + Tambah Item
                </button>
              )}
            </div>
          </div>
          {!selectedGame ? (
            <div className="admin-empty-state">Pilih game terlebih dahulu untuk melihat items</div>
          ) : (
            <div className="admin-table-wrap">
              <div style={{ marginBottom: '12px', color: '#94a3b8', fontSize: '0.9rem' }}>
                Items untuk: <strong style={{ color: '#e2e8f0' }}>{activeGame?.name}</strong>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nama Item</th><th>Qty</th><th>Harga Asli</th>
                    <th>Diskon</th><th>Harga Final</th><th style={{ width: 160 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {gameItems.length === 0 ? (
                    <tr><td colSpan={6} className="admin-empty">Belum ada item untuk game ini</td></tr>
                  ) : gameItems.map((item, idx) => (
                    <tr key={idx}>
                      <td><span className="admin-game-name">{item.itemName}</span></td>
                      <td>{item.qty}</td>
                      <td>Rp {formatPrice(item.originalPrice)}</td>
                      <td><span className="admin-badge-discount">{item.discountPercent}%</span></td>
                      <td><span className="admin-price">Rp {formatPrice(item.finalPrice)}</span></td>
                      <td>
                        <div className="admin-actions">
                          <button className="admin-btn-sm admin-btn-edit" onClick={() => openEditItem(item)}>Edit</button>
                          <button className="admin-btn-sm admin-btn-delete"
                            onClick={() => handleDeleteItem(item.itemName)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* === ADD GAME MODAL === */}
      {modal === 'addGame' && (
        <Modal title="Tambah Game Baru" onClose={() => setModal(null)}>
          <form onSubmit={handleCreateGame}>
            <Input label="Nama Game" value={gameForm.name}
              onChange={v => setGameForm(p => ({ ...p, name: v }))} required placeholder="Mobile Legends" />
            <Input label="Slug" value={gameForm.slug}
              onChange={v => setGameForm(p => ({ ...p, slug: v }))} required placeholder="mlbb" />
            <FileInput label="Logo Game" onChange={f => setGameFiles(p => ({ ...p, logo: f }))} />
            <FileInput label="Ikon Item" onChange={f => setGameFiles(p => ({ ...p, itemIcon: f }))} />
            <FileInput label="Background" onChange={f => setGameFiles(p => ({ ...p, bg: f }))} />
            <Input label="Background Position" value={gameForm.bgPosition}
              onChange={v => setGameForm(p => ({ ...p, bgPosition: v }))} placeholder="contoh: center top" />
            <div className="admin-field-hint">Posisi gambar background. Contoh: <code>center top</code>, <code>50% calc(50% - 300px)</code>, <code>right bottom</code></div>
            <div className="admin-field">
              <label>Zona ID</label>
              <select value={gameForm.hasZone}
                onChange={e => setGameForm(p => ({ ...p, hasZone: e.target.value === 'true' }))}>
                <option value="true">Ya — Game ini punya zone/server ID</option>
                <option value="false">Tidak — Hanya user ID saja</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Opsi Server / Zone</label>
              <input type="text" value={gameForm.zoneOptions}
                onChange={e => setGameForm(p => ({ ...p, zoneOptions: e.target.value }))}
                placeholder="Asia, America, Europe" />
              <div className="admin-field-hint">Pisahkan dengan koma. Jika diisi akan menjadi dropdown.</div>
            </div>
            <div className="admin-field">
              <label>Badge</label>
              <select value={gameForm.badge}
                onChange={e => setGameForm(p => ({ ...p, badge: e.target.value }))}>
                <option value="">Tidak ada</option>
                <option value="Hot">Hot</option>
                <option value="New">New</option>
                <option value="Promo">Promo</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Kategori Game</label>
              <select value={gameForm.categoryId}
                onChange={e => setGameForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">Pilih kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button type="submit" className="admin-btn admin-btn-primary">Simpan</button>
            </div>
          </form>
        </Modal>
      )}

      {/* === EDIT GAME MODAL === */}
      {modal === 'editGame' && (
        <Modal title="Edit Game" onClose={() => setModal(null)}>
          <form onSubmit={handleUpdateGame}>
            <Input label="Nama Game" value={gameForm.name}
              onChange={v => setGameForm(p => ({ ...p, name: v }))} required />
            <Input label="Slug" value={gameForm.slug}
              onChange={v => setGameForm(p => ({ ...p, slug: v }))} required />

            <FileInput key={`logo-${refreshKey}`} label="Logo Game"
              currentUrl={`/api/game-media/${editTarget}/logo?t=${refreshKey}`}
              onChange={f => setGameFiles(p => ({ ...p, logo: f }))}
              onRemove={() => setRemoveImages(p => ({ ...p, logo: true }))} />

            <FileInput key={`icon-${refreshKey}`} label="Ikon Item"
              currentUrl={`/api/game-media/${editTarget}/icon?t=${refreshKey}`}
              onChange={f => setGameFiles(p => ({ ...p, itemIcon: f }))}
              onRemove={() => setRemoveImages(p => ({ ...p, itemIcon: true }))} />

            <FileInput key={`bg-${refreshKey}`} label="Background"
              currentUrl={`/api/game-media/${editTarget}/bg?t=${refreshKey}`}
              onChange={f => setGameFiles(p => ({ ...p, bg: f }))}
              onRemove={() => setRemoveImages(p => ({ ...p, bg: true }))} />

            <Input label="Background Position" value={gameForm.bgPosition}
              onChange={v => setGameForm(p => ({ ...p, bgPosition: v }))} placeholder="contoh: center top" />
            <div className="admin-field-hint">Posisi gambar background. Contoh: <code>center top</code>, <code>50% calc(50% - 300px)</code>, <code>right bottom</code></div>
            <div className="admin-field">
              <label>Zona ID</label>
              <select value={gameForm.hasZone}
                onChange={e => setGameForm(p => ({ ...p, hasZone: e.target.value === 'true' }))}>
                <option value="true">Ya</option>
                <option value="false">Tidak</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Opsi Server / Zone</label>
              <input type="text" value={gameForm.zoneOptions}
                onChange={e => setGameForm(p => ({ ...p, zoneOptions: e.target.value }))}
                placeholder="Asia, America, Europe" />
              <div className="admin-field-hint">Pisahkan dengan koma. Jika diisi akan menjadi dropdown.</div>
            </div>
            <div className="admin-field">
              <label>Badge</label>
              <select value={gameForm.badge}
                onChange={e => setGameForm(p => ({ ...p, badge: e.target.value }))}>
                <option value="">Tidak ada</option>
                <option value="Hot">Hot</option>
                <option value="New">New</option>
                <option value="Promo">Promo</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Kategori Game</label>
              <select value={gameForm.categoryId}
                onChange={e => setGameForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">Pilih kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button type="submit" className="admin-btn admin-btn-primary">Update</button>
            </div>
          </form>
        </Modal>
      )}

      {/* === ADD ITEM MODAL === */}
      {modal === 'addItem' && (
        <Modal title="Tambah Item Baru" onClose={() => setModal(null)}>
          <form onSubmit={handleAddItem}>
            <Input label="Nama Item" value={itemForm.itemName}
              onChange={v => setItemForm(p => ({ ...p, itemName: v }))} required placeholder="100 Diamonds" />
            <Input label="Quantity" type="number" value={itemForm.qty}
              onChange={v => setItemForm(p => ({ ...p, qty: v }))} required placeholder="86" />
            <Input label="Harga Asli (Rp)" type="number" value={itemForm.originalPrice}
              onChange={v => setItemForm(p => ({ ...p, originalPrice: v }))} required placeholder="100000" />
            <Input label="Diskon (%)" type="number" value={itemForm.discountPercent}
              onChange={v => setItemForm(p => ({ ...p, discountPercent: v }))} placeholder="0" />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button type="submit" className="admin-btn admin-btn-primary">Simpan</button>
            </div>
          </form>
        </Modal>
      )}

      {/* === EDIT ITEM MODAL === */}
      {modal === 'editItem' && (
        <Modal title="Edit Item" onClose={() => setModal(null)}>
          <form onSubmit={handleUpdateItem}>
            <Input label="Nama Item" value={itemForm.itemName}
              onChange={v => setItemForm(p => ({ ...p, itemName: v }))} required />
            <Input label="Quantity" type="number" value={itemForm.qty}
              onChange={v => setItemForm(p => ({ ...p, qty: v }))} required />
            <Input label="Harga Asli (Rp)" type="number" value={itemForm.originalPrice}
              onChange={v => setItemForm(p => ({ ...p, originalPrice: v }))} required />
            <Input label="Diskon (%)" type="number" value={itemForm.discountPercent}
              onChange={v => setItemForm(p => ({ ...p, discountPercent: v }))} />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button type="submit" className="admin-btn admin-btn-primary">Update</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

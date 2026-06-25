import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../utils/api';
import '../styles/Admin.css';

const MODAL_STYLES = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '20px'
  },
  content: {
    background: '#1a1a2e', borderRadius: '12px', width: '100%',
    maxWidth: '560px', maxHeight: '90vh', overflow: 'auto',
    padding: '32px', border: '1px solid #2a2a45', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  }
};

function Modal({ title, children, onClose }) {
  return (
    <div style={MODAL_STYLES.overlay} onClick={onClose}>
      <div style={MODAL_STYLES.content} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>{title}</h2>
          <button onClick={onClose} className="admin-modal-close">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, required, placeholder, step }) {
  return (
    <div className="admin-field">
      <label>{label}{required && <span className="admin-required">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        placeholder={placeholder} step={step} />
    </div>
  );
}

function FileInput({ label, accept = 'image/png,image/jpeg,image/jpg,image/gif,image/webp', onChange, onRemove, currentUrl, hasImage }) {
  const [preview, setPreview] = useState(currentUrl || null);
  const fileRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    onChange(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleRemove = () => {
    if (fileRef.current) fileRef.current.value = '';
    setPreview(null);
    onChange(null);
    if (onRemove) onRemove();
  };

  return (
    <div className="admin-field">
      <label>{label}</label>
      <div className="admin-file-wrap">
        {preview && <img src={preview} alt="" className="admin-file-preview" onError={e => { e.target.style.display = 'none'; }} />}
        <div className="admin-file-inputs">
          <input ref={fileRef} type="file" accept={accept} onChange={handleChange} />
          {(preview || hasImage) && <button type="button" className="admin-btn-sm admin-btn-delete" onClick={handleRemove}>Hapus</button>}
        </div>
      </div>
    </div>
  );
}

/** Auth fetch for multipart/form-data */
const authFormFetch = async (endpoint, method, formData) => {
  const token = getAuthToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(endpoint, { method, headers, body: formData });
  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  return res.json();
};

const CACHE_KEYS = {
  GAMES: 'admin_cache_games',
  USERS: 'admin_cache_users',
  CATEGORIES: 'admin_cache_categories',
  SLIDES: 'admin_cache_slides',
  PROMOS: 'admin_cache_promos',
  BANNERS: 'admin_cache_banners',
  CONTACT: 'admin_cache_contact',
  VOUCHERS: 'admin_cache_vouchers',
  ITEMS: (gameId) => `admin_cache_items_${gameId}`
};

const getCache = (key) => {
  try {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Error reading cache', e);
    return null;
  }
};

const setCache = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing cache', e);
  }
};

export default function Admin() {
  const navigate = useNavigate();
  const [userData] = useState(() => {
    const stored = sessionStorage.getItem('currentUser');
    const token = sessionStorage.getItem('authToken');
    if (!stored || !token) return null;
    try {
      const u = JSON.parse(stored);
      if (u.isAdmin) return u;
    } catch {
      return null;
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState('games');
  const [games, setGames] = useState(() => getCache(CACHE_KEYS.GAMES) || []);
  const [users, setUsers] = useState(() => getCache(CACHE_KEYS.USERS) || []);
  const [categories, setCategories] = useState(() => getCache(CACHE_KEYS.CATEGORIES) || []);
  const [carouselSlides, setCarouselSlides] = useState(() => getCache(CACHE_KEYS.SLIDES) || []);
  const [promos, setPromos] = useState(() => getCache(CACHE_KEYS.PROMOS) || []);
  const [loading, setLoading] = useState(() => {
    const hasCached =
      sessionStorage.getItem('admin_cache_games') &&
      sessionStorage.getItem('admin_cache_users') &&
      sessionStorage.getItem('admin_cache_categories') &&
      sessionStorage.getItem('admin_cache_slides') &&
      sessionStorage.getItem('admin_cache_promos') &&
      sessionStorage.getItem('admin_cache_banners') &&
      sessionStorage.getItem('admin_cache_contact') &&
      sessionStorage.getItem('admin_cache_vouchers');
    return !hasCached;
  });

  // Modal & form state
  const [modal, setModal] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameItems, setGameItems] = useState([]);

  // Game form — text fields
  const emptyGameForm = { name: '', slug: '', bgPosition: '', hasZone: true, badge: '', categoryId: '' };
  const [gameForm, setGameForm] = useState(emptyGameForm);
  // Game form — file fields (selected new files)
  const [gameFiles, setGameFiles] = useState({ logo: null, bg: null, itemIcon: null });
  // Game form — which existing images to DELETE on save
  const [removeImages, setRemoveImages] = useState({ logo: false, bg: false, itemIcon: false });
  const [editTarget, setEditTarget] = useState(null);
  // Existing image flags from API (hasLogo, hasBg, hasIcon)
  const [hasImages, setHasImages] = useState({ logo: false, bg: false, itemIcon: false });

  // Item form
  const emptyItemForm = { qty: '', itemName: '', originalPrice: '', discountPercent: '0' };
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const emptyCatForm = { name: '', slug: '' };
  const [catForm, setCatForm] = useState(emptyCatForm);
  const [catEdit, setCatEdit] = useState(null);

  const emptySlideForm = { title: '', subtitle: '', cta: '', link: '', sortOrder: '0', isActive: 'true' };
  const [slideForm, setSlideForm] = useState(emptySlideForm);
  const [slideImage, setSlideImage] = useState(null);
  const [slideEdit, setSlideEdit] = useState(null);
  const [slideHasImage, setSlideHasImage] = useState(false);

  const emptyPromoForm = { category: '', gameName: '', periodText: '', timeText: '', cashbackText: '', notes: '', isActive: 'true' };
  const [promoForm, setPromoForm] = useState(emptyPromoForm);
  const [promoEdit, setPromoEdit] = useState(null);

  const emptyBannerForm = { title: '', periodText: '', regionText: 'Seluruh Indonesia', categoryText: 'Games', subheading: '', isActive: 'true' };
  const [bannerForm, setBannerForm] = useState(emptyBannerForm);
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerEdit, setBannerEdit] = useState(null);
  const [bannerHasImage, setBannerHasImage] = useState(false);
  const [removeBannerImage, setRemoveBannerImage] = useState(false);

  const emptyVoucherForm = { code: '', rewardValue: '', quota: '100', rewardType: 'points', isActive: 'true', validUntil: '' };
  const [voucherForm, setVoucherForm] = useState(emptyVoucherForm);
  const [voucherEdit, setVoucherEdit] = useState(null);

  const [promoBanners, setPromoBanners] = useState(() => getCache(CACHE_KEYS.BANNERS) || []);
  const [promoSubTab, setPromoSubTab] = useState('rows'); // 'rows' or 'banners'
  const [contactMessages, setContactMessages] = useState(() => getCache(CACHE_KEYS.CONTACT) || []);
  const [vouchers, setVouchers] = useState(() => getCache(CACHE_KEYS.VOUCHERS) || []);

  // Refresh key to bust image cache after updates
  const [refreshKey, setRefreshKey] = useState(0);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!userData) {
      navigate('/login');
    }
  }, [userData, navigate]);

  const loadGames = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/games', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setGames(json.data);
        setCache(CACHE_KEYS.GAMES, json.data);
      }
    } catch {
      const cached = getCache(CACHE_KEYS.GAMES);
      if (!cached) showToast('Gagal memuat games', 'error');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
        setCache(CACHE_KEYS.USERS, json.data);
      }
    } catch {
      const cached = getCache(CACHE_KEYS.USERS);
      if (!cached) showToast('Gagal memuat users', 'error');
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/categories', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
        setCache(CACHE_KEYS.CATEGORIES, json.data);
      }
    } catch { /* ignore */ }
  }, []);

  const loadCarouselSlides = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/carousel-slides', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setCarouselSlides(json.data);
        setCache(CACHE_KEYS.SLIDES, json.data);
      }
    } catch { /* ignore */ }
  }, []);

  const loadPromos = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/promos', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setPromos(json.data);
        setCache(CACHE_KEYS.PROMOS, json.data);
      }
    } catch {
      const cached = getCache(CACHE_KEYS.PROMOS);
      if (!cached) showToast('Gagal memuat promos', 'error');
    }
  }, []);

  const loadPromoBanners = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/promo-banners', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setPromoBanners(json.data);
        setCache(CACHE_KEYS.BANNERS, json.data);
      }
    } catch {
      const cached = getCache(CACHE_KEYS.BANNERS);
      if (!cached) showToast('Gagal memuat promo banners', 'error');
    }
  }, []);

  const loadContactMessages = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/contact-messages', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setContactMessages(json.data);
        setCache(CACHE_KEYS.CONTACT, json.data);
      }
    } catch {
      const cached = getCache(CACHE_KEYS.CONTACT);
      if (!cached) showToast('Gagal memuat pesan masuk', 'error');
    }
  }, []);

  const loadVouchers = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/vouchers', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setVouchers(json.data);
        setCache(CACHE_KEYS.VOUCHERS, json.data);
      }
    } catch {
      const cached = getCache(CACHE_KEYS.VOUCHERS);
      if (!cached) showToast('Gagal memuat voucher', 'error');
    }
  }, []);

  const loadItems = useCallback(async (gameId) => {
    if (!gameId) {
      setTimeout(() => setGameItems([]), 0);
      return;
    }
    const key = CACHE_KEYS.ITEMS(gameId);
    const cached = getCache(key);
    if (cached) {
      setTimeout(() => setGameItems(cached), 0);
    }
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/games/${gameId}/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setGameItems(json.data.items);
        setCache(key, json.data.items);
      }
    } catch {
      if (!cached) showToast('Gagal memuat items', 'error');
    }
  }, []);

  useEffect(() => {
    if (!userData) return;
    const timer = setTimeout(() => {
      Promise.all([
        loadGames(),
        loadUsers(),
        loadCategories(),
        loadCarouselSlides(),
        loadPromos(),
        loadPromoBanners(),
        loadContactMessages(),
        loadVouchers()
      ]).finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [userData, loadGames, loadUsers, loadCategories, loadCarouselSlides, loadPromos, loadPromoBanners, loadContactMessages, loadVouchers]);

  useEffect(() => {
    if (activeTab === 'items' && selectedGame) {
      const timer = setTimeout(() => loadItems(selectedGame), 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedGame, loadItems]);

  // ---- helpers ----
  const resetGameForm = () => {
    setGameForm(emptyGameForm);
    setGameFiles({ logo: null, bg: null, itemIcon: null });
    setRemoveImages({ logo: false, bg: false, itemIcon: false });
    setHasImages({ logo: false, bg: false, itemIcon: false });
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
    if (removeImages.logo) fd.append('removeLogo', 'true');
    if (removeImages.bg) fd.append('removeBg', 'true');
    if (removeImages.itemIcon) fd.append('removeIcon', 'true');
    return fd;
  };

  // ---- Game CRUD ----
  const handleCreateGame = async (e) => {
    e.preventDefault();
    try {
      const json = await authFormFetch('/api/admin/games', 'POST', buildGameFormData());
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setRefreshKey(k => k + 1);
        resetGameForm();
        loadGames(true);
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
        setRefreshKey(k => k + 1);
        resetGameForm();
        loadGames(true);
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal mengupdate game', 'error'); }
  };

  const handleDeleteGame = async (id) => {
    if (!confirm('Yakin ingin menghapus game ini?')) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/games/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) { showToast(json.message); loadGames(true); }
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
          badge: g.badge || '',
          categoryId: g.categoryId || ''
        });
        setHasImages({ logo: g.hasLogo || false, bg: g.hasBg || false, icon: g.hasIcon || false });
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
        body: JSON.stringify({
          ...itemForm,
          qty: Number(itemForm.qty),
          originalPrice: Number(itemForm.originalPrice),
          discountPercent: Number(itemForm.discountPercent)
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setItemForm(emptyItemForm);
        loadItems(selectedGame, true);
        loadGames(true);
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
        body: JSON.stringify({
          ...itemForm,
          qty: Number(itemForm.qty),
          originalPrice: Number(itemForm.originalPrice),
          discountPercent: Number(itemForm.discountPercent)
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setItemForm(emptyItemForm);
        setEditTarget(null);
        loadItems(selectedGame, true);
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
      if (json.success) {
        showToast(json.message);
        loadItems(selectedGame, true);
        loadGames(true);
      }
      else showToast(json.message, 'error');
    } catch { showToast('Gagal menghapus item', 'error'); }
  };

  // ---- Promo CRUD ----
  const handleCreatePromo = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...promoForm,
          isActive: promoForm.isActive === 'true'
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setPromoForm(emptyPromoForm);
        loadPromos(true);
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
        body: JSON.stringify({
          ...promoForm,
          isActive: promoForm.isActive === 'true'
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setModal(null);
        setPromoForm(emptyPromoForm);
        setPromoEdit(null);
        loadPromos(true);
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal mengupdate promo', 'error'); }
  };

  const handleDeletePromo = async (id) => {
    if (!confirm('Yakin ingin menghapus promo ini?')) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/promos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) { showToast(json.message); loadPromos(true); }
      else showToast(json.message, 'error');
    } catch { showToast('Gagal menghapus promo', 'error'); }
  };

  // ---- Promo Banners CRUD ----
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
        setRefreshKey(k => k + 1);
        setBannerForm(emptyBannerForm);
        setBannerImage(null);
        loadPromoBanners(true);
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
        setRefreshKey(k => k + 1);
        setBannerForm(emptyBannerForm);
        setBannerImage(null);
        setBannerEdit(null);
        setRemoveBannerImage(false);
        loadPromoBanners(true);
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal mengupdate banner promo', 'error'); }
  };

  const handleDeleteBanner = async (id) => {
    if (!confirm('Yakin ingin menghapus banner promo ini?')) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/promo-banners/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) { showToast(json.message); loadPromoBanners(true); }
      else showToast(json.message, 'error');
    } catch { showToast('Gagal menghapus banner promo', 'error'); }
  };

  const handleDeleteMessage = async (id) => {
    if (!confirm('Yakin ingin menghapus pesan ini?')) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/contact-messages/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        loadContactMessages(true);
      } else showToast(json.message, 'error');
    } catch { showToast('Gagal menghapus pesan', 'error'); }
  };

  // ---- UI ----
  const formatPrice = (p) => new Intl.NumberFormat('id-ID').format(p || 0);
  const activeGame = games.find(g => g.id === selectedGame);

  if (!userData) return null;

  const TABS = [
    { key: 'games', label: 'Games', icon: '🎮' },
    { key: 'items', label: 'Items', icon: '📦' },
    { key: 'users', label: 'Users', icon: '👥' },
    { key: 'categories', label: 'Categories', icon: '🏷️' },
    { key: 'carousel', label: 'Carousel', icon: '📺' },
    { key: 'promos', label: 'Promos', icon: '🔥' },
    { key: 'messages', label: 'Pesan', icon: '✉️' },
    { key: 'vouchers', label: 'Voucher', icon: '🎟️' },
  ];

  return (
    <div className="admin-layout">
      {toast && <div className={`admin-toast admin-toast--${toast.type}`}>{toast.msg}</div>}

      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="admin-brand-icon">◆</span>
          <span className="admin-brand-text">Rast7 Admin</span>
        </div>
        <nav className="admin-sidebar-nav">
          {TABS.map(t => (
            <button key={t.key} className={`admin-nav-item ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              <span className="admin-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-nav-item" onClick={() => navigate('/')}>
            <span className="admin-nav-icon">←</span>
            <span>Kembali ke Site</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <h1 className="admin-page-title">
            {TABS.find(t => t.key === activeTab)?.label || 'Dashboard'}
          </h1>
          <div className="admin-topbar-user">
            <span className="admin-topbar-name">{userData.username}</span>
            <span className="admin-topbar-badge">Admin</span>
          </div>
        </header>

        <div className="admin-content">
          {loading ? (
            <div className="admin-loading">Memuat data...</div>
          ) : (
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
                          <th>Nama</th>
                          <th>Slug</th>
                          <th>Category</th>
                          <th>Badge</th>
                          <th>Items</th>
                          <th>Logo</th>
                          <th style={{ width: 160 }}>Aksi</th>
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
                              {g.hasLogo
                                ? <img src={`/api/game-media/${g.id}/logo?t=${refreshKey}`} alt="" className="admin-thumb"
                                    onError={e => { e.target.style.display = 'none'; }} />
                                : '-'}
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
                            <th>Nama Item</th>
                            <th>Qty</th>
                            <th>Harga Asli</th>
                            <th>Diskon</th>
                            <th>Harga Final</th>
                            <th style={{ width: 160 }}>Aksi</th>
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

              {activeTab === 'users' && (
                <section>
                  <div className="admin-section-header">
                    <p className="admin-section-desc">{users.length} user terdaftar</p>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Level</th>
                          <th>Points</th>
                          <th>Bergabung</th>
                          <th>Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? (
                          <tr><td colSpan={6} className="admin-empty">Belum ada user</td></tr>
                        ) : users.map(u => (
                          <tr key={u.id}>
                            <td><span className="admin-game-name">{u.username}</span></td>
                            <td>{u.email}</td>
                            <td>{u.level || 1}</td>
                            <td>{u.points ?? 0}</td>
                            <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{u.joinDate || '-'}</td>
                            <td>{u.isAdmin
                              ? <span className="admin-role-badge">Admin</span>
                              : <span className="admin-role-badge admin-role-badge--user">User</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === 'categories' && (
                <section>
                  <div className="admin-section-header">
                    <p className="admin-section-desc">{categories.length} kategori</p>
                    <button className="admin-btn admin-btn-primary"
                      onClick={() => { setCatForm({ name: '', slug: '' }); setCatEdit(null); setModal('addCategory'); }}>
                      + Tambah Kategori
                    </button>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr><th>Nama</th><th>Slug</th><th style={{ width: 160 }}>Aksi</th></tr>
                      </thead>
                      <tbody>
                        {categories.length === 0 ? (
                          <tr><td colSpan={3} className="admin-empty">Belum ada kategori</td></tr>
                        ) : categories.map(cat => (
                          <tr key={cat.id}>
                            <td><span className="admin-game-name">{cat.name}</span></td>
                            <td><code className="admin-code">{cat.slug}</code></td>
                            <td>
                              <div className="admin-actions">
                                <button className="admin-btn-sm admin-btn-edit"
                                  onClick={() => { setCatForm({ name: cat.name, slug: cat.slug }); setCatEdit(cat.id); setModal('addCategory'); }}>Edit</button>
                                <button className="admin-btn-sm admin-btn-delete"
                                  onClick={async () => {
                                    if (!confirm(`Hapus kategori "${cat.name}"?`)) return;
                                    const token = getAuthToken();
                                    await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                    loadCategories(true);
                                  }}>Hapus</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === 'carousel' && (
                <section>
                  <div className="admin-section-header">
                    <p className="admin-section-desc">{carouselSlides.length} slide</p>
                    <button className="admin-btn admin-btn-primary"
                      onClick={() => { setSlideForm(emptySlideForm); setSlideImage(null); setSlideEdit(null); setSlideHasImage(false); setModal('addSlide'); }}>
                      + Tambah Slide
                    </button>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr><th>Urutan</th><th>Judul</th><th>CTA</th><th>Tautan</th><th>Gambar</th><th>Aktif</th><th style={{ width: 160 }}>Aksi</th></tr>
                      </thead>
                      <tbody>
                        {carouselSlides.length === 0 ? (
                          <tr><td colSpan={7} className="admin-empty">Belum ada slide</td></tr>
                        ) : carouselSlides.map(s => (
                          <tr key={s.id}>
                            <td><span className="admin-badge">{s.sortOrder}</span></td>
                            <td><span className="admin-game-name">{s.title}</span></td>
                            <td>{s.cta}</td>
                            <td><code className="admin-code">{s.link}</code></td>
                            <td>{s.hasImage ? <span className="admin-badge-badge" data-badge="Hot">Ada</span> : '-'}</td>
                            <td>{s.isActive ? <span className="admin-category-badge">Aktif</span> : <span style={{ color: '#64748b' }}>Nonaktif</span>}</td>
                            <td>
                              <div className="admin-actions">
                                <button className="admin-btn-sm admin-btn-edit"
                                  onClick={() => {
                                    setSlideForm({ title: s.title, subtitle: s.subtitle || '', cta: s.cta, link: s.link, sortOrder: String(s.sortOrder), isActive: String(s.isActive) });
                                    setSlideImage(null);
                                    setSlideEdit(s.id);
                                    setSlideHasImage(s.hasImage);
                                    setModal('addSlide');
                                  }}>Edit</button>
                                <button className="admin-btn-sm admin-btn-delete"
                                  onClick={async () => {
                                    if (!confirm(`Hapus slide "${s.title}"?`)) return;
                                    const token = getAuthToken();
                                    await fetch(`/api/admin/carousel-slides/${s.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                    loadCarouselSlides(true);
                                  }}>Hapus</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === 'promos' && (
                <section>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #2a2a45', paddingBottom: '12px' }}>
                    <button className={`admin-btn ${promoSubTab === 'rows' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                      onClick={() => setPromoSubTab('rows')}>
                      Baris Jadwal Promo ({promos.length})
                    </button>
                    <button className={`admin-btn ${promoSubTab === 'banners' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                      onClick={() => setPromoSubTab('banners')}>
                      Banner & Config Halaman ({promoBanners.length})
                    </button>
                  </div>

                  {promoSubTab === 'rows' && (
                    <>
                      <div className="admin-section-header">
                        <p className="admin-section-desc">Daftar baris jadwal promo di bagian bawah tabel</p>
                        <button className="admin-btn admin-btn-primary"
                          onClick={() => { setPromoForm(emptyPromoForm); setPromoEdit(null); setModal('addPromo'); }}>
                          + Tambah Baris Promo
                        </button>
                      </div>
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Kategori</th>
                              <th>Game</th>
                              <th>Periode</th>
                              <th>Jam</th>
                              <th>Cashback</th>
                              <th>Keterangan</th>
                              <th>Aktif</th>
                              <th style={{ width: 160 }}>Aksi</th>
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
                                          category: p.category,
                                          gameName: p.gameName,
                                          periodText: p.periodText,
                                          timeText: p.timeText || '',
                                          cashbackText: p.cashbackText,
                                          notes: p.notes || '-',
                                          isActive: String(p.isActive)
                                        });
                                        setPromoEdit(p.id);
                                        setModal('addPromo');
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

                  {promoSubTab === 'banners' && (
                    <>
                      <div className="admin-section-header">
                        <p className="admin-section-desc">Konfigurasi header, deskripsi, dan banner utama halaman Promo</p>
                        <button className="admin-btn admin-btn-primary"
                          onClick={() => { setBannerForm(emptyBannerForm); setBannerImage(null); setBannerEdit(null); setBannerHasImage(false); setRemoveBannerImage(false); setModal('addPromoBanner'); }}>
                          + Tambah Config Banner
                        </button>
                      </div>
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Judul</th>
                              <th>Periode</th>
                              <th>Region</th>
                              <th>Kategori</th>
                              <th>Subheading</th>
                              <th>Banner</th>
                              <th>Aktif</th>
                              <th style={{ width: 160 }}>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {promoBanners.length === 0 ? (
                              <tr><td colSpan={8} className="admin-empty">Belum ada config banner</td></tr>
                            ) : promoBanners.map(b => (
                              <tr key={b.id}>
                                <td><span className="admin-game-name">{b.title}</span></td>
                                <td>{b.periodText}</td>
                                <td>{b.regionText}</td>
                                <td>{b.categoryText}</td>
                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.subheading}</td>
                                <td>{b.hasImage ? <span className="admin-badge-badge" data-badge="Hot">Ada</span> : '-'}</td>
                                <td>{b.isActive ? <span className="admin-category-badge">Aktif</span> : <span style={{ color: '#64748b' }}>Nonaktif</span>}</td>
                                <td>
                                  <div className="admin-actions">
                                    <button className="admin-btn-sm admin-btn-edit"
                                      onClick={() => {
                                        setBannerForm({
                                          title: b.title,
                                          periodText: b.periodText,
                                          regionText: b.regionText,
                                          categoryText: b.categoryText,
                                          subheading: b.subheading,
                                          isActive: String(b.isActive)
                                        });
                                        setBannerImage(null);
                                        setBannerEdit(b.id);
                                        setBannerHasImage(b.hasImage);
                                        setRemoveBannerImage(false);
                                        setModal('addPromoBanner');
                                      }}>Edit</button>
                                    <button className="admin-btn-sm admin-btn-delete"
                                      onClick={() => handleDeleteBanner(b.id)}>Hapus</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              )}

              {activeTab === 'messages' && (
                <section>
                  <div className="admin-section-header">
                    <p className="admin-section-desc">{contactMessages.length} pesan/keluhan masuk</p>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Pesan / Keluhan</th>
                          <th>User ID</th>
                          <th>Tanggal</th>
                          <th style={{ width: 100 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contactMessages.length === 0 ? (
                          <tr><td colSpan={6} className="admin-empty">Belum ada pesan masuk</td></tr>
                        ) : contactMessages.map(msg => (
                          <tr key={msg.id}>
                            <td><span className="admin-game-name">{msg.user?.username || 'Guest'}</span></td>
                            <td>
                              {msg.user?.email ? (
                                <a href={`mailto:${msg.user.email}`} style={{ color: '#00f2ff', textDecoration: 'none' }}>{msg.user.email}</a>
                              ) : '-'}
                            </td>
                            <td style={{ whiteSpace: 'normal', wordBreak: 'break-all', minWidth: 200 }}>{msg.message}</td>
                            <td><code className="admin-code">{msg.userId}</code></td>
                            <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{new Date(msg.createdAt).toLocaleString('id-ID')}</td>
                            <td>
                              <button className="admin-btn-sm admin-btn-delete" onClick={() => handleDeleteMessage(msg.id)}>
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === 'vouchers' && (
                <section>
                  <div className="admin-section-header">
                    <p className="admin-section-desc">{vouchers.length} kode voucher</p>
                    <button className="admin-btn admin-btn-primary"
                      onClick={() => { setVoucherForm(emptyVoucherForm); setVoucherEdit(null); setModal('addVoucher'); }}>
                      + Tambah Voucher
                    </button>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Kode</th>
                          <th>Reward</th>
                          <th>Kuota</th>
                          <th>Terpakai</th>
                          <th>Tipe</th>
                          <th>Berakhir</th>
                          <th>Status</th>
                          <th style={{ width: 160 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vouchers.length === 0 ? (
                          <tr><td colSpan={8} className="admin-empty">Belum ada voucher</td></tr>
                        ) : vouchers.map(v => (
                          <tr key={v.id}>
                            <td><code className="admin-code" style={{ fontSize: '0.9rem' }}>{v.code}</code></td>
                            <td><span className="admin-price">{v.rewardValue.toLocaleString('id-ID')}</span></td>
                            <td>{v.quota}</td>
                            <td>{v.usedCount}</td>
                            <td>{v.rewardType || '-'}</td>
                            <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                              {v.validUntil ? new Date(v.validUntil).toLocaleDateString('id-ID') : '-'}
                            </td>
                            <td>
                              {v.isActive
                                ? <span className="admin-category-badge">Aktif</span>
                                : <span style={{ color: '#64748b' }}>Nonaktif</span>}
                            </td>
                            <td>
                              <div className="admin-actions">
                                <button className="admin-btn-sm admin-btn-edit"
                                  onClick={() => {
                                    setVoucherForm({
                                      code: v.code,
                                      rewardValue: String(v.rewardValue),
                                      quota: String(v.quota),
                                      rewardType: v.rewardType || 'points',
                                      isActive: String(v.isActive),
                                      validUntil: v.validUntil ? v.validUntil.slice(0, 10) : ''
                                    });
                                    setVoucherEdit(v.id);
                                    setModal('addVoucher');
                                  }}>Edit</button>
                                <button className="admin-btn-sm admin-btn-delete"
                                  onClick={async () => {
                                    if (!confirm(`Hapus voucher "${v.code}"?`)) return;
                                    const token = getAuthToken();
                                    const res = await fetch(`/api/admin/vouchers/${v.id}`, {
                                      method: 'DELETE',
                                      headers: { Authorization: `Bearer ${token}` }
                                    });
                                    const json = await res.json();
                                    if (json.success) { showToast(json.message); loadVouchers(true); }
                                    else showToast(json.message, 'error');
                                  }}>Hapus</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

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

            <FileInput key={`logo-${refreshKey}`} label="Logo Game" hasImage={hasImages.logo}
              currentUrl={hasImages.logo ? `/api/game-media/${editTarget}/logo?t=${refreshKey}` : null}
              onChange={f => setGameFiles(p => ({ ...p, logo: f }))}
              onRemove={() => setRemoveImages(p => ({ ...p, logo: true }))} />

            <FileInput key={`icon-${refreshKey}`} label="Ikon Item" hasImage={hasImages.icon}
              currentUrl={hasImages.icon ? `/api/game-media/${editTarget}/icon?t=${refreshKey}` : null}
              onChange={f => setGameFiles(p => ({ ...p, itemIcon: f }))}
              onRemove={() => setRemoveImages(p => ({ ...p, itemIcon: true }))} />

            <FileInput key={`bg-${refreshKey}`} label="Background" hasImage={hasImages.bg}
              currentUrl={hasImages.bg ? `/api/game-media/${editTarget}/bg?t=${refreshKey}` : null}
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

      {/* === ADD/EDIT CATEGORY MODAL === */}
      {modal === 'addCategory' && (
        <Modal title={catEdit ? 'Edit Kategori' : 'Tambah Kategori'} onClose={() => setModal(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const token = getAuthToken();
            const method = catEdit ? 'PUT' : 'POST';
            const url = catEdit ? `/api/admin/categories/${catEdit}` : '/api/admin/categories';
            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(catForm)
            });
            const json = await res.json();
            if (json.success) {
              showToast(json.message);
              setModal(null);
              setCatForm(emptyCatForm);
              setCatEdit(null);
              loadCategories(true);
            } else showToast(json.message, 'error');
          }}>
            <Input label="Nama Kategori" value={catForm.name}
              onChange={v => setCatForm(p => ({ ...p, name: v }))} required placeholder="Mobile" />
            <Input label="Slug" value={catForm.slug}
              onChange={v => setCatForm(p => ({ ...p, slug: v }))} required placeholder="mobile" />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button type="submit" className="admin-btn admin-btn-primary">{catEdit ? 'Update' : 'Simpan'}</button>
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

      {/* === ADD/EDIT SLIDE MODAL === */}
      {modal === 'addSlide' && (
        <Modal title={slideEdit ? 'Edit Slide' : 'Tambah Slide'} onClose={() => setModal(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const token = getAuthToken();
            const method = slideEdit ? 'PUT' : 'POST';
            const url = slideEdit ? `/api/admin/carousel-slides/${slideEdit}` : '/api/admin/carousel-slides';
            const fd = new FormData();
            fd.append('title', slideForm.title);
            fd.append('subtitle', slideForm.subtitle);
            fd.append('cta', slideForm.cta);
            fd.append('link', slideForm.link);
            fd.append('sortOrder', slideForm.sortOrder);
            fd.append('isActive', slideForm.isActive);
            if (slideImage) fd.append('image', slideImage);
            if (slideEdit && !slideHasImage && !slideImage) fd.append('removeImage', 'true');

            const headers = { Authorization: `Bearer ${token}` };
            const res = await fetch(url, { method, headers, body: fd });
            const json = await res.json();
            if (json.success) {
              showToast(json.message);
              setModal(null);
              setSlideForm(emptySlideForm);
              setSlideImage(null);
              setSlideEdit(null);
              setSlideHasImage(false);
              loadCarouselSlides(true);
            } else showToast(json.message, 'error');
          }}>
            <Input label="Judul" value={slideForm.title}
              onChange={v => setSlideForm(p => ({ ...p, title: v }))} required placeholder="Top Up Game Terpercaya" />
            <Input label="Subtitle" value={slideForm.subtitle}
              onChange={v => setSlideForm(p => ({ ...p, subtitle: v }))} placeholder="Murah, Cepat, dan Aman..." />
            <Input label="CTA Button" value={slideForm.cta}
              onChange={v => setSlideForm(p => ({ ...p, cta: v }))} required placeholder="Lihat Game" />
            <Input label="Tautan (link)" value={slideForm.link}
              onChange={v => setSlideForm(p => ({ ...p, link: v }))} required placeholder="#all-games" />
            <Input label="Urutan" type="number" value={slideForm.sortOrder}
              onChange={v => setSlideForm(p => ({ ...p, sortOrder: v }))} placeholder="0" />
            <div className="admin-field">
              <label>Status</label>
              <select value={slideForm.isActive}
                onChange={e => setSlideForm(p => ({ ...p, isActive: e.target.value }))}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Gambar Slide</label>
              <div className="admin-file-wrap">
                {slideHasImage && !slideImage && (
                  <img src={`/api/carousel-media/${slideEdit}`} alt="" className="admin-file-preview"
                    style={{ maxHeight: 120 }} />
                )}
                {slideImage && (
                  <img src={URL.createObjectURL(slideImage)} alt="" className="admin-file-preview"
                    style={{ maxHeight: 120 }} />
                )}
                <div className="admin-file-inputs">
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={e => setSlideImage(e.target.files?.[0] || null)} />
                  {(slideHasImage || slideImage) && (
                    <button type="button" className="admin-btn-sm admin-btn-delete"
                      onClick={() => { setSlideImage(null); setSlideHasImage(false); }}>Hapus</button>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button type="submit" className="admin-btn admin-btn-primary">{slideEdit ? 'Update' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* === ADD/EDIT PROMO ROW MODAL === */}
      {modal === 'addPromo' && (
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

      {/* === ADD/EDIT PROMO BANNER MODAL === */}
      {modal === 'addPromoBanner' && (
        <Modal title={bannerEdit ? 'Edit Config Banner' : 'Tambah Config Banner'} onClose={() => setModal(null)}>
          <form onSubmit={bannerEdit ? handleUpdateBanner : handleCreateBanner}>
            <Input label="Judul Banner/Page" value={bannerForm.title}
              onChange={v => setBannerForm(p => ({ ...p, title: v }))} required placeholder="Promo Games: Cashback hingga 90% Buat Top Up Game di RAST" />
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
                    style={{ maxHeight: 120 }} />
                )}
                {bannerImage && (
                  <img src={URL.createObjectURL(bannerImage)} alt="" className="admin-file-preview"
                    style={{ maxHeight: 120 }} />
                )}
                <div className="admin-file-inputs">
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={e => {
                      setBannerImage(e.target.files?.[0] || null);
                      setRemoveBannerImage(false);
                    }} />
                  {(bannerHasImage || bannerImage) && (
                    <button type="button" className="admin-btn-sm admin-btn-delete"
                      onClick={() => {
                        setBannerImage(null);
                        setBannerHasImage(false);
                        setRemoveBannerImage(true);
                      }}>Hapus</button>
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

      {/* === ADD/EDIT VOUCHER MODAL === */}
      {modal === 'addVoucher' && (
        <Modal title={voucherEdit ? 'Edit Voucher' : 'Tambah Voucher'} onClose={() => setModal(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const token = getAuthToken();
            const method = voucherEdit ? 'PUT' : 'POST';
            const url = voucherEdit ? `/api/admin/vouchers/${voucherEdit}` : '/api/admin/vouchers';
            try {
              const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  ...voucherForm,
                  rewardValue: Number(voucherForm.rewardValue),
                  quota: Number(voucherForm.quota)
                })
              });
              const json = await res.json();
              if (json.success) {
                showToast(json.message);
                setModal(null);
                setVoucherForm(emptyVoucherForm);
                setVoucherEdit(null);
                loadVouchers(true);
              } else showToast(json.message, 'error');
            } catch { showToast('Gagal menyimpan voucher', 'error'); }
          }}>
            <Input label="Kode Voucher" value={voucherForm.code}
              onChange={v => setVoucherForm(p => ({ ...p, code: v }))} required placeholder="RAST72026" />
            <Input label="Nilai Reward (Poin)" type="number" value={voucherForm.rewardValue}
              onChange={v => setVoucherForm(p => ({ ...p, rewardValue: v }))} required placeholder="10000" />
            <Input label="Kuota" type="number" value={voucherForm.quota}
              onChange={v => setVoucherForm(p => ({ ...p, quota: v }))} placeholder="100" />
            <div className="admin-field">
              <label>Tipe Reward</label>
              <select value={voucherForm.rewardType}
                onChange={e => setVoucherForm(p => ({ ...p, rewardType: e.target.value }))}>
                <option value="points">Points</option>
              </select>
            </div>
            <Input label="Berlaku Sampai (Kosongkan jika tidak ada batas)" type="date" value={voucherForm.validUntil}
              onChange={v => setVoucherForm(p => ({ ...p, validUntil: v }))} />
            <div className="admin-field">
              <label>Status</label>
              <select value={voucherForm.isActive}
                onChange={e => setVoucherForm(p => ({ ...p, isActive: e.target.value }))}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button type="submit" className="admin-btn admin-btn-primary">{voucherEdit ? 'Update' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

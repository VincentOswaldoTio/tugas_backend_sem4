import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { imageUpload } from '../middleware/upload.js';

const router = express.Router();
const BASE = process.env.BASE_URL || '';

// All admin routes require authentication + admin role
router.use(authenticate, authorizeAdmin);

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 */
router.get('/admin/users', async (req, res) => {
  try {
    const users = await req.userService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    req.userService.handleError(res, err, "Gagal mengambil data users");
  }
});

// ==============================
// GAMES CRUD
// ==============================

/**
 * @openapi
 * /api/admin/games:
 *   get:
 *     summary: List all games with item count (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of games
 */
router.get('/admin/games', async (req, res) => {
  try {
    const games = await req.prisma.games.findMany({
      orderBy: { createdAt: 'desc' },
      include: { category: true }
    });
    const data = games.map(g => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      badge: g.badge,
      category: g.category ? { id: g.category.id, name: g.category.name } : null,
      categoryId: g.categoryId,
      hasLogo: !!g.logo,
      hasBg: !!g.bg,
      hasIcon: !!g.itemIcon,
      logoUrl: g.logo ? `${BASE}/api/game-media/${g.id}/logo` : null,
      bgUrl: g.bg ? `${BASE}/api/game-media/${g.id}/bg` : null,
      bgPosition: g.bgPosition,
      hasZone: g.hasZone,
      itemCount: g.items?.length || 0,
      createdAt: g.createdAt
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/games/{id}:
 *   get:
 *     summary: Get single game with full details (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full game data
 *       404:
 *         description: Game not found
 */
router.get('/admin/games/:id', async (req, res) => {
  try {
    const game = await req.prisma.games.findUnique({
      where: { id: req.params.id },
      include: { category: true }
    });
    if (!game) return res.status(404).json({ success: false, message: "Game tidak ditemukan" });

    const data = {
      ...game,
      logo: undefined,
      bg: undefined,
      itemIcon: undefined,
      category: game.category ? { id: game.category.id, name: game.category.name } : null,
      hasLogo: !!game.logo,
      hasBg: !!game.bg,
      hasIcon: !!game.itemIcon,
      logoUrl: game.logo ? `${BASE}/api/game-media/${game.id}/logo` : null,
      bgUrl: game.bg ? `${BASE}/api/game-media/${game.id}/bg` : null,
      itemIconUrl: game.itemIcon ? `${BASE}/api/game-media/${game.id}/icon` : null
    };

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/games:
 *   post:
 *     summary: Create a new game with images (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               logo: { type: string, format: binary }
 *               bg: { type: string, format: binary }
 *               itemIcon: { type: string, format: binary }
 *               hasZone: { type: boolean }
 *               bgPosition: { type: string }
 *     responses:
 *       201:
 *         description: Game created
 *       400:
 *         description: Validation error
 */
router.post('/admin/games', imageUpload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'bg', maxCount: 1 },
  { name: 'itemIcon', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      name, slug, badge, categoryId,
      hasZone, bgPosition,
      userIdLabel, userIdPlaceholder,
      zoneIdLabel, zoneIdPlaceholder, zoneIdHint, zoneIdMaxLength
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "Nama dan slug game wajib diisi" });
    }

    const existing = await req.prisma.games.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Slug sudah digunakan" });
    }

    const game = await req.prisma.games.create({
      data: {
        name,
        slug,
        badge: badge || null,
        categoryId: categoryId || null,
        logo: req.files?.logo?.[0]?.buffer || undefined,
        itemIcon: req.files?.itemIcon?.[0]?.buffer || undefined,
        bg: req.files?.bg?.[0]?.buffer || undefined,
        bgPosition: bgPosition || null,
        hasZone: hasZone !== 'false',
        userIdLabel: userIdLabel || "USER ID",
        userIdPlaceholder: userIdPlaceholder || "Masukkan User ID",
        zoneIdLabel: zoneIdLabel || "ZONE ID",
        zoneIdPlaceholder: zoneIdPlaceholder || "Zone ID",
        zoneIdHint: zoneIdHint || "4 DIGIT",
        zoneIdMaxLength: zoneIdMaxLength ? parseInt(zoneIdMaxLength) : 4,
        items: { set: [] }
      }
    });

    res.status(201).json({
      success: true,
      message: "Game berhasil ditambahkan",
      data: { id: game.id, name: game.name, slug: game.slug }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/games/{id}:
 *   put:
 *     summary: Update a game and its images (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               logo: { type: string, format: binary }
 *               bg: { type: string, format: binary }
 *               itemIcon: { type: string, format: binary }
 *               hasZone: { type: boolean }
 *               bgPosition: { type: string }
 *     responses:
 *       200:
 *         description: Game updated
 *       404:
 *         description: Game not found
 */
router.put('/admin/games/:id', imageUpload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'bg', maxCount: 1 },
  { name: 'itemIcon', maxCount: 1 }
]), async (req, res) => {
  try {
    const existing = await req.prisma.games.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: "Game tidak ditemukan" });

    const updateData = {};
    const textFields = [
      'name', 'slug', 'bgPosition',
      'userIdLabel', 'userIdPlaceholder',
      'zoneIdLabel', 'zoneIdPlaceholder', 'zoneIdHint'
    ];

    for (const field of textFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    // badge can be cleared — empty string means "no badge"
    if (req.body.badge !== undefined) updateData.badge = req.body.badge || null;
    if (req.body.categoryId !== undefined) updateData.categoryId = req.body.categoryId || null;
    if (req.body.hasZone !== undefined) updateData.hasZone = req.body.hasZone !== 'false';
    if (req.body.zoneIdMaxLength !== undefined) updateData.zoneIdMaxLength = parseInt(req.body.zoneIdMaxLength);

    // Handle image uploads — only update if a new file was sent
    if (req.files?.logo?.[0]?.buffer) updateData.logo = req.files.logo[0].buffer;
    if (req.files?.bg?.[0]?.buffer) updateData.bg = req.files.bg[0].buffer;
    if (req.files?.itemIcon?.[0]?.buffer) updateData.itemIcon = req.files.itemIcon[0].buffer;

    // Handle image removal flags
    if (req.body.removeLogo === 'true') updateData.logo = null;
    if (req.body.removeBg === 'true') updateData.bg = null;
    if (req.body.removeIcon === 'true') updateData.itemIcon = null;

    if (updateData.slug) {
      const slugConflict = await req.prisma.games.findFirst({
        where: { slug: updateData.slug, id: { not: req.params.id } }
      });
      if (slugConflict) return res.status(400).json({ success: false, message: "Slug sudah digunakan" });
    }

    const game = await req.prisma.games.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ success: true, message: "Game berhasil diupdate", data: { id: game.id, name: game.name } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/games/{id}:
 *   delete:
 *     summary: Delete a game (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Game deleted
 *       404:
 *         description: Game not found
 */
router.delete('/admin/games/:id', async (req, res) => {
  try {
    await req.prisma.games.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Game berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==============================
// GAME ITEMS CRUD (embedded)
// ============================== (unchanged — items stay as JSON)

/**
 * @openapi
 * /api/admin/games/{id}/items:
 *   get:
 *     summary: List items for a game (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Game items array
 *       404:
 *         description: Game not found
 */
router.get('/admin/games/:id/items', async (req, res) => {
  try {
    const game = await req.prisma.games.findUnique({
      where: { id: req.params.id },
      select: { items: true, name: true }
    });
    if (!game) return res.status(404).json({ success: false, message: "Game tidak ditemukan" });
    res.json({ success: true, data: { gameName: game.name, items: game.items || [] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/games/{id}/items:
 *   post:
 *     summary: Add an item to a game (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemName, qty, originalPrice]
 *             properties:
 *               itemName: { type: string }
 *               qty: { type: integer }
 *               originalPrice: { type: number }
 *               discountPercent: { type: number }
 *     responses:
 *       201:
 *         description: Item added
 *       400:
 *         description: Validation error
 */
router.post('/admin/games/:id/items', async (req, res) => {
  try {
    const { qty, itemName, originalPrice, discountPercent, finalPrice } = req.body;

    if (!itemName || qty === undefined || originalPrice === undefined) {
      return res.status(400).json({ success: false, message: "Nama item, qty, dan harga wajib diisi" });
    }

    const game = await req.prisma.games.findUnique({
      where: { id: req.params.id },
      select: { items: true }
    });
    if (!game) return res.status(404).json({ success: false, message: "Game tidak ditemukan" });

    if (game.items?.some(i => i.itemName === itemName)) {
      return res.status(400).json({ success: false, message: "Item dengan nama tersebut sudah ada" });
    }

    const newItem = {
      qty: parseInt(qty),
      itemName,
      originalPrice: parseFloat(originalPrice),
      discountPercent: parseFloat(discountPercent || 0),
      finalPrice: finalPrice ?? Math.round(parseFloat(originalPrice) * (1 - (parseFloat(discountPercent || 0) / 100)))
    };

    await req.prisma.games.update({
      where: { id: req.params.id },
      data: { items: { push: newItem } }
    });

    res.status(201).json({ success: true, message: "Item berhasil ditambahkan", data: newItem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/games/{id}/items/{itemName}:
 *   put:
 *     summary: Update an item (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: itemName
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemName: { type: string }
 *               qty: { type: integer }
 *               originalPrice: { type: number }
 *               discountPercent: { type: number }
 *     responses:
 *       200:
 *         description: Item updated
 *       404:
 *         description: Item not found
 */
router.put('/admin/games/:id/items/:itemName', async (req, res) => {
  try {
    const game = await req.prisma.games.findUnique({
      where: { id: req.params.id },
      select: { items: true }
    });
    if (!game) return res.status(404).json({ success: false, message: "Game tidak ditemukan" });

    const oldName = decodeURIComponent(req.params.itemName);
    const items = [...(game.items || [])];
    const idx = items.findIndex(i => i.itemName === oldName);
    if (idx === -1) return res.status(404).json({ success: false, message: "Item tidak ditemukan" });

    const { qty, itemName, originalPrice, discountPercent, finalPrice } = req.body;
    const existing = items[idx];

    const updatedItem = {
      qty: qty !== undefined ? parseInt(qty) : existing.qty,
      itemName: itemName ?? existing.itemName,
      originalPrice: originalPrice !== undefined ? parseFloat(originalPrice) : existing.originalPrice,
      discountPercent: discountPercent !== undefined ? parseFloat(discountPercent) : existing.discountPercent,
      finalPrice: finalPrice ?? Math.round(
        (originalPrice !== undefined ? parseFloat(originalPrice) : existing.originalPrice) *
        (1 - ((discountPercent !== undefined ? parseFloat(discountPercent) : existing.discountPercent) / 100))
      )
    };

    items[idx] = updatedItem;

    await req.prisma.games.update({
      where: { id: req.params.id },
      data: { items: { set: items } }
    });

    res.json({ success: true, message: "Item berhasil diupdate", data: updatedItem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/games/{id}/items/{itemName}:
 *   delete:
 *     summary: Delete an item from a game (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: itemName
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item deleted
 *       404:
 *         description: Item not found
 */
router.delete('/admin/games/:id/items/:itemName', async (req, res) => {
  try {
    const game = await req.prisma.games.findUnique({
      where: { id: req.params.id },
      select: { items: true }
    });
    if (!game) return res.status(404).json({ success: false, message: "Game tidak ditemukan" });

    const itemName = decodeURIComponent(req.params.itemName);
    const filtered = (game.items || []).filter(i => i.itemName !== itemName);

    if (filtered.length === game.items?.length) {
      return res.status(404).json({ success: false, message: "Item tidak ditemukan" });
    }

    await req.prisma.games.update({
      where: { id: req.params.id },
      data: { items: { set: filtered } }
    });

    res.json({ success: true, message: "Item berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==============================
// CATEGORIES CRUD (admin)
// ==============================

router.get('/admin/categories', async (req, res) => {
  try {
    const categories = await req.prisma.categories.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/categories', async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "Nama dan slug wajib diisi" });
    }
    const category = await req.prisma.categories.create({ data: { name, slug } });
    res.status(201).json({ success: true, message: "Kategori berhasil ditambahkan", data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/categories/:id', async (req, res) => {
  try {
    const { name, slug } = req.body;
    const category = await req.prisma.categories.update({
      where: { id: req.params.id },
      data: { name, slug }
    });
    res.json({ success: true, message: "Kategori berhasil diupdate", data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/admin/categories/:id', async (req, res) => {
  try {
    await req.prisma.categories.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Kategori berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==============================
// CAROUSEL SLIDES CRUD (admin)
// ==============================

router.get('/admin/carousel-slides', async (req, res) => {
  try {
    const slides = await req.prisma.carousel_slides.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    const data = slides.map(s => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      cta: s.cta,
      link: s.link,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
      hasImage: !!s.image,
      imageUrl: s.image ? `${BASE}/api/carousel-media/${s.id}` : null,
      createdAt: s.createdAt
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/carousel-slides', imageUpload.fields([
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, subtitle, cta, link, sortOrder, isActive } = req.body;
    if (!title || !cta || !link) {
      return res.status(400).json({ success: false, message: "Title, CTA, dan link wajib diisi" });
    }
    const slide = await req.prisma.carousel_slides.create({
      data: {
        title,
        subtitle: subtitle || '',
        cta,
        link,
        image: req.files?.image?.[0]?.buffer || undefined,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        isActive: isActive !== 'false'
      }
    });
    res.status(201).json({ success: true, message: "Slide berhasil ditambahkan", data: { id: slide.id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/carousel-slides/:id', imageUpload.fields([
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const slide = await req.prisma.carousel_slides.findUnique({ where: { id: req.params.id } });
    if (!slide) return res.status(404).json({ success: false, message: "Slide tidak ditemukan" });

    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.subtitle !== undefined) updateData.subtitle = req.body.subtitle;
    if (req.body.cta !== undefined) updateData.cta = req.body.cta;
    if (req.body.link !== undefined) updateData.link = req.body.link;
    if (req.body.sortOrder !== undefined) updateData.sortOrder = parseInt(req.body.sortOrder);
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive !== 'false';
    if (req.files?.image?.[0]?.buffer) updateData.image = req.files.image[0].buffer;
    if (req.body.removeImage === 'true') updateData.image = null;

    await req.prisma.carousel_slides.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ success: true, message: "Slide berhasil diupdate" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/admin/carousel-slides/:id', async (req, res) => {
  try {
    await req.prisma.carousel_slides.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Slide berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==============================
// PROMOS CRUD (admin)
// ==============================

router.get('/admin/promos', async (req, res) => {
  try {
    const promos = await req.prisma.promos.findMany({
      orderBy: { createdAt: 'asc' }
    });
    const data = promos.map(p => ({
      id: p.id,
      category: p.category,
      gameName: p.gameName,
      periodText: p.periodText,
      timeText: p.timeText,
      cashbackText: p.cashbackText,
      notes: p.notes,
      isActive: p.isActive,
      createdAt: p.createdAt
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/promos', async (req, res) => {
  try {
    const { category, gameName, periodText, timeText, cashbackText, notes, isActive } = req.body;
    if (!category || !gameName || !periodText || !cashbackText) {
      return res.status(400).json({ success: false, message: "Kategori, nama game, periode, dan cashback wajib diisi" });
    }
    const promo = await req.prisma.promos.create({
      data: {
        category,
        gameName,
        periodText,
        timeText: timeText || '',
        cashbackText,
        notes: notes || '-',
        isActive: isActive !== 'false'
      }
    });
    res.status(201).json({ success: true, message: "Promo berhasil ditambahkan", data: { id: promo.id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/promos/:id', async (req, res) => {
  try {
    const promo = await req.prisma.promos.findUnique({ where: { id: req.params.id } });
    if (!promo) return res.status(404).json({ success: false, message: "Promo tidak ditemukan" });

    const updateData = {};
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.gameName !== undefined) updateData.gameName = req.body.gameName;
    if (req.body.periodText !== undefined) updateData.periodText = req.body.periodText;
    if (req.body.timeText !== undefined) updateData.timeText = req.body.timeText;
    if (req.body.cashbackText !== undefined) updateData.cashbackText = req.body.cashbackText;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive !== 'false';

    await req.prisma.promos.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ success: true, message: "Promo berhasil diupdate" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/admin/promos/:id', async (req, res) => {
  try {
    await req.prisma.promos.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Promo berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==============================
// PROMO BANNERS CRUD (admin)
// ==============================

router.get('/admin/promo-banners', async (req, res) => {
  try {
    const banners = await req.prisma.promo_banners.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const data = banners.map(b => ({
      id: b.id,
      title: b.title,
      periodText: b.periodText,
      regionText: b.regionText,
      categoryText: b.categoryText,
      subheading: b.subheading,
      isActive: b.isActive,
      hasImage: !!b.image,
      imageUrl: b.image ? `${BASE}/api/promo-media/banner/${b.id}` : null,
      createdAt: b.createdAt
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/promo-banners', imageUpload.fields([
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, periodText, regionText, categoryText, subheading, isActive } = req.body;
    if (!title || !periodText || !subheading) {
      return res.status(400).json({ success: false, message: "Judul, periode, dan sub-header wajib diisi" });
    }
    const banner = await req.prisma.promo_banners.create({
      data: {
        title,
        periodText,
        regionText: regionText || 'Seluruh Indonesia',
        categoryText: categoryText || 'Games',
        subheading,
        image: req.files?.image?.[0]?.buffer || undefined,
        isActive: isActive !== 'false'
      }
    });
    res.status(201).json({ success: true, message: "Banner promo berhasil ditambahkan", data: { id: banner.id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/promo-banners/:id', imageUpload.fields([
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const banner = await req.prisma.promo_banners.findUnique({ where: { id: req.params.id } });
    if (!banner) return res.status(404).json({ success: false, message: "Banner promo tidak ditemukan" });

    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.periodText !== undefined) updateData.periodText = req.body.periodText;
    if (req.body.regionText !== undefined) updateData.regionText = req.body.regionText;
    if (req.body.categoryText !== undefined) updateData.categoryText = req.body.categoryText;
    if (req.body.subheading !== undefined) updateData.subheading = req.body.subheading;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive !== 'false';
    if (req.files?.image?.[0]?.buffer) updateData.image = req.files.image[0].buffer;
    if (req.body.removeImage === 'true') updateData.image = null;

    await req.prisma.promo_banners.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ success: true, message: "Banner promo berhasil diupdate" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==============================
// CONTACT MESSAGES CRUD (admin)
// ==============================

router.get('/admin/contact-messages', async (req, res) => {
  try {
    const messages = await req.prisma.contact_messages.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/admin/contact-messages/:id', async (req, res) => {
  try {
    await req.prisma.contact_messages.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: "Pesan berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==============================
// VOUCHERS CRUD (admin)
// ==============================

/**
 * @openapi
 * /api/admin/vouchers:
 *   get:
 *     summary: List all vouchers (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of vouchers
 */
router.get('/admin/vouchers', async (req, res) => {
  try {
    const vouchers = await req.prisma.vouchers.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const data = vouchers.map(v => ({
      id: v.id,
      code: v.code,
      rewardValue: v.rewardValue,
      quota: v.quota,
      usedCount: v.usedCount,
      rewardType: v.rewardType,
      isActive: v.isActive,
      validUntil: v.validUntil,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/vouchers:
 *   post:
 *     summary: Create a new voucher (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, rewardValue]
 *             properties:
 *               code: { type: string }
 *               rewardValue: { type: integer }
 *               quota: { type: integer }
 *               rewardType: { type: string }
 *               isActive: { type: string }
 *               validUntil: { type: string }
 *     responses:
 *       201:
 *         description: Voucher created
 *       400:
 *         description: Validation error
 */
router.post('/admin/vouchers', async (req, res) => {
  try {
    const { code, rewardValue, quota, rewardType, isActive, validUntil } = req.body;
    if (!code || rewardValue === undefined) {
      return res.status(400).json({ success: false, message: "Kode dan nilai reward wajib diisi" });
    }

    const existing = await req.prisma.vouchers.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Kode voucher sudah ada" });
    }

    const voucher = await req.prisma.vouchers.create({
      data: {
        code: code.toUpperCase(),
        rewardValue: parseInt(rewardValue),
        quota: quota ? parseInt(quota) : 100,
        rewardType: rewardType || 'points',
        isActive: isActive !== 'false',
        validUntil: validUntil ? new Date(validUntil) : null
      }
    });
    res.status(201).json({ success: true, message: "Voucher berhasil ditambahkan", data: { id: voucher.id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/vouchers/{id}:
 *   put:
 *     summary: Update a voucher (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code: { type: string }
 *               rewardValue: { type: integer }
 *               quota: { type: integer }
 *               rewardType: { type: string }
 *               isActive: { type: string }
 *               validUntil: { type: string }
 *     responses:
 *       200:
 *         description: Voucher updated
 *       404:
 *         description: Voucher not found
 */
router.put('/admin/vouchers/:id', async (req, res) => {
  try {
    const voucher = await req.prisma.vouchers.findUnique({ where: { id: req.params.id } });
    if (!voucher) return res.status(404).json({ success: false, message: "Voucher tidak ditemukan" });

    const updateData = {};
    if (req.body.code !== undefined) {
      const newCode = req.body.code.toUpperCase();
      const conflict = await req.prisma.vouchers.findFirst({
        where: { code: newCode, id: { not: req.params.id } }
      });
      if (conflict) return res.status(400).json({ success: false, message: "Kode voucher sudah ada" });
      updateData.code = newCode;
    }
    if (req.body.rewardValue !== undefined) updateData.rewardValue = parseInt(req.body.rewardValue);
    if (req.body.quota !== undefined) updateData.quota = parseInt(req.body.quota);
    if (req.body.rewardType !== undefined) updateData.rewardType = req.body.rewardType;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive !== 'false';
    if (req.body.validUntil !== undefined) updateData.validUntil = req.body.validUntil ? new Date(req.body.validUntil) : null;

    await req.prisma.vouchers.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json({ success: true, message: "Voucher berhasil diupdate" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/vouchers/{id}:
 *   delete:
 *     summary: Delete a voucher (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Voucher deleted
 *       404:
 *         description: Voucher not found
 */
router.delete('/admin/vouchers/:id', async (req, res) => {
  try {
    await req.prisma.vouchers.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Voucher berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

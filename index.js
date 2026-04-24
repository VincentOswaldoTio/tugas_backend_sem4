import express from 'express';
import { prisma } from './lib/prisma';
const app = express();
app.use(express.json())

app.get('/api/users', async(req, res) => {
    try {
        const showAllUser = await prisma.users.findMany()
        res.status(200).json({ success: true, message: "User berhasil ditampilkan semua", data: showAllUser });
    } catch (err) {
        res.status(500).json({message: "Query salah broski"})
    }
})

app.post('/api/users', async(req, res) => {
    try {
        const { email, username, password } = req.body;
        const createUser = await prisma.users.create({
            data: { email, username, password }
        });
        res.json({ success: true, message: "User berhasil dibuat", data: createUser });
    } catch (err) {
        res.status(500).json({message: "Query salah broski"});
    }
})

app.post('/api/login', async(req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username/Email dan Password wajib diisi" });
        }
        // Cari user berdasarkan email atau username
        const user = await prisma.users.findFirst({
            where: { OR: [ { email: username }, { username: username }]}
        });

        if (!user) {
            return res.status(401).json({ success: false, message: "Username/Email tidak ditemukan" });
        }
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: "Password salah" });
        }

        res.json({ success: true, message: "Login berhasil", data: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar: user.avatar || "/asset/profile.png",
                level: user.level || 1,
                joinDate: user.joinDate || new Date().toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                }),
                birthday: user.birthday || "01-Jan-2000",
                gender: user.gender || "Female"
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
})

app.listen(3000, () => {
    console.log("server berhasil dijalankan http://localhost:3000")
})
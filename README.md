# Backend - Tugas Backend Semester 4

Backend API untuk manajemen user dengan Express.js dan Prisma ORM.

## Fitur

- Register user baru
- Login dengan username atau email
- Upload avatar (file disimpan di database)
- Update profil user
- Delete user
- List semua user

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Prisma** - Database ORM
- **Multer** - File upload handling
- **Mongodb** - Database (default)
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication

## Prerequisites

- Node.js >= 18.x
- npm atau yarn

## Instalasi

1. Install dependencies:
```bash
npm install
```

2. Setup database:
```bash
npx prisma generate
```

3. Jalankan server database dan website:
```bash
npx tsx index
npm run dev
```

Server akan berjalan di `http://localhost:3000` dan `http://localhost:5173`

## API Endpoints

### 1. Register User
```
POST /api/register
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}

Response: Returns user data with JWT token (expires in 1 day)
```

### 2. Login
```
POST /api/login
Content-Type: application/json

Body:
{
  "username": "username",  // bisa email atau username
  "password": "password123"
}

Response: Returns user data with JWT token (expires in 1 day)
```

### 3. Get All Users (Admin Only)
```
GET /api/users
Authorization: Bearer <token>

Note: Requires admin role (isAdmin=true)
```

### 4. Upload Avatar
```
POST /api/upload-avatar
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- avatar: [file gambar]
- userId: [id user]

Note: User can only upload their own avatar (or admin)
```

### 5. Get Avatar (Public)
```
GET /api/avatar/:userId
```

### 6. Update Profile
```
PUT /api/profile/:userId
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "username": "newusername",
  "email": "newemail@example.com",
  "password": "newpassword",
  "birthday": "1990-01-01",
  "gender": "male"
}

Note: User can only update their own profile (or admin)
```

### 7. Get User Points
```
GET /api/points/:userId
Authorization: Bearer <token>

Note: User can only view their own points (or admin)
```

### 8. Get Point Config
```
GET /api/points/config/:userId
Authorization: Bearer <token>

Note: User can only view their own config (or admin)
```

### 9. Get Point Mileage
```
GET /api/points/mileage/:userId
Authorization: Bearer <token>

Note: User can only view their own mileage (or admin)
```

### 10. Create Transaction
```
POST /api/transaction
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "userId": "user_id",
  "targetAccount": { "accountId": "123", "zoneId": "456" },
  "purchaseDetails": { "gameName": "Mobile Legends", "itemName": "Diamonds", "itemQty": 86, "paymentMethod": "Gopay" },
  "billing": { "basePrice": 100000, "taxAmount": 11000, "pointsUsed": 0, "totalPaid": 111000 }
}

Note: User can only create transactions for themselves (or admin)
```

### 11. Get Transaction History
```
GET /api/history/:userId
Authorization: Bearer <token>

Note: User can only view their own history (or admin)
```

### 12. Redeem Voucher
```
POST /api/redeem
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "userId": "user_id",
  "code": "VOUCHER_CODE"
}

Note: User can only redeem vouchers for themselves (or admin)
```

### 13. Get Leaderboard (Public)
```
GET /api/leaderboard
```

### 14. Get Games (Public)
```
GET /api/games
GET /api/games/:slug
```

### 15. Get Payment Methods (Public)
```
GET /api/payment-methods
```

### 16. Reset Password
```
POST /api/reset-password
Content-Type: application/json

Body:
{
  "emailOrUsername": "user@example.com",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

### 17. Delete User
```
DELETE /api/deleteUser/:userId
Authorization: Bearer <token>

Note: User can only delete their own account (or admin)
```

### Authentication
- All protected endpoints require `Authorization: Bearer <token>` header
- Token expires in 1 day
- On 401 response, clear sessionStorage and redirect to login
- Admin-only endpoint: `GET /api/users` (requires `isAdmin=true` in user model)

### Environment Variables
Create `.env` file with:
```
JWT_SECRET=your-secret-here
DATABASE_URL=mongodb+srv://...
```

## Struktur Database

Tabel `users`:
- `id` - Primary key
- `email` - Email user (unik)
- `username` - Username (unik)
- `password` - Password (hashed with bcrypt)
- `avatar` - Buffer gambar (Bytes)
- `joinDate` - Tanggal bergabung
- `birthday` - Tanggal lahir
- `gender` - Jenis kelamin
- `level` - Level user (default: 1)
- `isAdmin` - Admin role flag (default: false)
- `createdAt` - Timestamp pembuatan

## Catatan

- Password di-hash menggunakan bcrypt (cost factor 10)
- JWT token expire dalam 1 hari
- Avatar disimpan sebagai buffer di database
- File upload dibatasi maksimal 10 MB
- Format gambar yang diterima: jpeg, jpg, png, gif, webp
- Gunakan .env.example sebagai template untuk environment variables

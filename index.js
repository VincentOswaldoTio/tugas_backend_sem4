import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';
import { UserService, TransactionService, PointConfigService } from './src/services/index.js';
import { requestLogger } from './src/middleware/logger.js';
import { handleMulterError } from './src/middleware/upload.js';

// Import route modules
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/users.js';
import transactionRoutes from './src/routes/transactions.js';
import publicRoutes from './src/routes/public.js';
import adminRoutes from './src/routes/admin.js';

// Import Swagger documentation
import { swaggerUiMiddleware, swaggerUiSetup } from './src/documentation/swagger.js';

const app = express();

// CORS — izinkan akses dari frontend (Vercel atau domain manapun)
app.use(cors());

// Global request logger
app.use(requestLogger);

// Swagger API Documentation
app.use('/api-docs', swaggerUiMiddleware, swaggerUiSetup);

// Initialize service classes
const userService = new UserService(prisma);
const pointConfigService = new PointConfigService(prisma);
const transactionService = new TransactionService(prisma, pointConfigService);

app.use(express.json());

// Inject services into request object for route handlers
app.use((req, res, next) => {
  req.userService = userService;
  req.transactionService = transactionService;
  req.pointConfigService = pointConfigService;
  req.prisma = prisma;
  next();
});

// =================== ROUTES ===================

// Public routes (no auth)
app.use('/api', publicRoutes);

// Auth routes (public but with validation)
app.use('/api', authRoutes);

// Protected user routes (auth + ensureSelf)
app.use('/api', userRoutes);

// Protected transaction routes (auth + ensureSelf)
app.use('/api', transactionRoutes);

// Admin routes (auth + authorizeAdmin)
app.use('/api', adminRoutes);

// Multer error handler (must be after routes that use multer)
app.use(handleMulterError);

app.listen(3000, () => {
  console.log("server berhasil dijalankan http://localhost:3000");
});

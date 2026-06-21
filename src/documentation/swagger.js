import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rast7 API',
      version: '1.0.0',
      description: 'Top-up platform API with authentication, transactions, games, and points system',
      contact: {
        name: 'Rast7 Team',
        email: 'support@rast7.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token from /api/login or /api/register'
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Token tidak valid atau telah berakhir, silakan login kembali' }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login berhasil' },
            data: { type: 'object' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '6a350e5d3ef8e971f409ddff' },
            email: { type: 'string', example: 'user@example.com' },
            username: { type: 'string', example: 'testuser' },
            avatar: { type: 'string', example: '/api/avatar/6a350e5d3ef8e971f409ddff' },
            level: { type: 'integer', example: 1 },
            joinDate: { type: 'string', example: '19 Jun 2026' },
            birthday: { type: 'string', example: '-' },
            gender: { type: 'string', example: '-' },
            isAdmin: { type: 'boolean', example: false },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'username', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            username: { type: 'string', example: 'testuser' },
            password: { type: 'string', minLength: 6, example: 'password123' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'testuser' },
            password: { type: 'string', example: 'password123' }
          }
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['emailOrUsername', 'newPassword', 'confirmPassword'],
          properties: {
            emailOrUsername: { type: 'string', example: 'user@example.com' },
            newPassword: { type: 'string', minLength: 6, example: 'newpassword123' },
            confirmPassword: { type: 'string', example: 'newpassword123' }
          }
        },
        TransactionRequest: {
          type: 'object',
          required: ['userId', 'targetAccount', 'purchaseDetails', 'billing'],
          properties: {
            userId: { type: 'string', example: '6a350e5d3ef8e971f409ddff' },
            targetAccount: {
              type: 'object',
              properties: {
                accountId: { type: 'string', example: '12345' },
                zoneId: { type: 'string', example: '6789' }
              }
            },
            purchaseDetails: {
              type: 'object',
              properties: {
                gameName: { type: 'string', example: 'Mobile Legends' },
                itemName: { type: 'string', example: 'Diamonds' },
                itemQty: { type: 'integer', example: 86 },
                paymentMethod: { type: 'string', example: 'Gopay' }
              }
            },
            billing: {
              type: 'object',
              properties: {
                basePrice: { type: 'number', example: 100000 },
                taxAmount: { type: 'number', example: 11000 },
                pointsUsed: { type: 'integer', example: 0 },
                totalPaid: { type: 'number', example: 111000 }
              }
            }
          }
        },
        RedeemRequest: {
          type: 'object',
          required: ['userId', 'code'],
          properties: {
            userId: { type: 'string', example: '6a350e5d3ef8e971f409ddff' },
            code: { type: 'string', example: 'SUKSES77' }
          }
        },
        Game: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            logoUrl: { type: 'string' },
            bgUrl: { type: 'string' }
          }
        },
        PaymentMethod: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            logoUrl: { type: 'string' },
            taxPercent: { type: 'number' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints (register, login, password reset)' },
      { name: 'User', description: 'User profile, avatar, points, mileage' },
      { name: 'Transactions', description: 'Transaction history, creation, voucher redemption' },
      { name: 'Public', description: 'Public endpoints (games, payment methods, leaderboard)' },
      { name: 'Admin', description: 'Admin-only endpoints' }
    ]
  },
  apis: ['./src/routes/*.js'] // Path to route files with @openapi comments
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiMiddleware = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; border-radius: 5px }
  `,
  customSiteTitle: 'Rast7 API Documentation',
  swaggerOptions: {
    persistAuthorization: true, // Keep token across refreshes
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true
  }
});
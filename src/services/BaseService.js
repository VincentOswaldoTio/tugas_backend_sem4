class BaseService {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  // Method umum untuk handle error secara konsisten
  handleError(res, error, customMessage = "Terjadi kesalahan pada server") {
    console.error(customMessage, error);
    const message = error.message || customMessage;
    return res.status(500).json({ success: false, message });
  }

  // Method umum untuk response sukses
  successResponse(res, data, message = "Berhasil", statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data });
  }

  // Method umum untuk response error (client error)
  errorResponse(res, message, statusCode = 400) {
    return res.status(statusCode).json({ success: false, message });
  }
}

export default BaseService;

/**
 * Simple request logger middleware
 * Logs method, path, status code, and response time
 */

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capture original res.json to log after response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log in format: METHOD /path STATUS_CODE RESPONSE_TIME_MS
    console.log(`${req.method} ${req.path} ${statusCode} ${responseTime}ms`);

    return originalJson(body);
  };

  next();
};
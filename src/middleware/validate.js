/**
 * Validation middleware helper
 * Checks required fields are present in request body
 */

export const validateBody = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Field berikut wajib diisi: ${missingFields.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Specific validators for common routes
 */
export const validateRegister = validateBody(['email', 'username', 'password']);
export const validateLogin = validateBody(['username', 'password']);
export const validateResetPassword = validateBody(['emailOrUsername', 'newPassword', 'confirmPassword']);
export const validateTransaction = validateBody(['userId', 'targetAccount', 'purchaseDetails', 'billing']);
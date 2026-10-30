// src/utils/errors.js

export const ErrorRegistry = {
  BAD_REQUEST: { code: 40001, message: "Invalid payload parameters provided." },
  UNAUTHORIZED: { code: 40101, message: "Authentication failed or token missing." },
  FORBIDDEN: { code: 40301, message: "You do not have permission to access this resource." },
  NOT_FOUND: { code: 40401, message: "Requested resource could not be found." },
  INTERNAL_SERVER_ERROR: { code: 50001, message: "An unexpected internal server error occurred." },
  DEPENDENCY_FAILURE: { code: 50201, message: "An upstream dependency failed health inspection bounds." }
};

export function formatStandardError(err, customRegistryKey = null) {
  const baseError = customRegistryKey ? ErrorRegistry[customRegistryKey] : ErrorRegistry.INTERNAL_SERVER_ERROR;
  
return {
    success: false,
    error: {
      code: baseError.code,
      message: err.message || baseError.message,
      timestamp: new Date().toISOString(),
      details: err.details || null,
      field: err.field || null
    }
  };
}
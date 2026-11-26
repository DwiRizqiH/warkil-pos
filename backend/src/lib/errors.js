export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Belum masuk') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Tidak punya akses') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Data tidak ditemukan') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message) => new AppError(409, 'CONFLICT', message);
export const locked = (message) => new AppError(423, 'LOCKED', message);
export const badGateway = (message) => new AppError(502, 'BAD_GATEWAY', message);
export const unavailable = (message) => new AppError(503, 'UNAVAILABLE', message);

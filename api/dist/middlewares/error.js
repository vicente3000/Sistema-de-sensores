export class HttpError extends Error {
    status;
    details;
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}
export function notFound(req, res) {
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
}
export function errorHandler(err, req, res, _next) {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message, details: err.details });
    }
    console.error('Unhandled error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
}

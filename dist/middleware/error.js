export function notFound(req, res) {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.originalUrl}`,
    });
}
export function errorHandler(err, _req, res, _next) {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    if (process.env.NODE_ENV !== 'production') {
        console.error(err);
    }
    res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}
//# sourceMappingURL=error.js.map
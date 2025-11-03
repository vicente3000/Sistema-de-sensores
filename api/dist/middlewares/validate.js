export function validateBody(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'ValidationError', details: parsed.error.flatten() });
        }
        // overwrite body with parsed data to ensure types
        req.body = parsed.data;
        next();
    };
}
export function validateQuery(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: 'ValidationError', details: parsed.error.flatten() });
        }
        req.query = parsed.data;
        next();
    };
}

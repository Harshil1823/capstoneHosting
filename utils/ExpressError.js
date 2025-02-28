class ExpressError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        // Mark the error as operational (not a bug)
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ExpressError;
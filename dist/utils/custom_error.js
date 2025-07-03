class CustomError extends Error {
    statusCode;
    statusText; // Changed to statusText
    isOperational;
    error;
    success; // Added this line
    constructor(message, statusCode = 500) {
        super(message);
        this.error = message || 'Internal server error';
        this.success = false; // Added this line
        this.statusCode = statusCode;
        this.statusText = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error'; // Renamed to statusText
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
export default CustomError;

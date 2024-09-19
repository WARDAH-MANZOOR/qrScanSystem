class CustomError extends Error {
    statusCode;
    statusText; // Changed to statusText
    isOperational;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.statusText = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error'; // Renamed to statusText
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
export default CustomError;
//const error = new CustomError('some error message', 404)

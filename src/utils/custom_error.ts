class CustomError extends Error {
    statusCode: number;
    statusText: string; // Changed to statusText
    isOperational: boolean;
    error: string;
    succes: boolean;    // Added this line

    constructor(message: string, statusCode: number) {
        super(message);
        this.error = message;
        this.succes = false;    // Added this line
        this.statusCode = statusCode;
        this.statusText = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error'; // Renamed to statusText
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}


export default CustomError;

//const error = new CustomError('some error message', 404)
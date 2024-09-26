
class ApiResponse {
    static success<T>(data: T, message: string = 'Operation successful', statusCode: number = 200) {
        return {
            success: true,
            message,
            data,
            statusCode,
        };
    }

    static error(message: string, statusCode: number = 400) {
        return {
            success: false,
            message,
            statusCode,
        };
    }
}

export default ApiResponse;

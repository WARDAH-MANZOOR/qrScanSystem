class ApiResponse {
    static success(data, message = "Operation successful", statusCode = 200) {
        if (data?.message) {
            message = data.message;
            delete data.message;
        }
        if (data?.data && typeof data.data === "object") {
            data = data.data;
        }
        return {
            success: true,
            message,
            data,
            statusCode,
        };
    }
    static error(message, statusCode = 400) {
        return {
            success: false,
            message,
            statusCode,
        };
    }
}
export default ApiResponse;

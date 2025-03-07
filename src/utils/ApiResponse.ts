class ApiResponse {
  static success<T>(
    data: T | any,
    message: string = "Operation successful",
    statusCode: number = 200
  ) {
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
      status: 'Completed'
    };
  }

  static error(message: string, statusCode: number = 400) {
    return {
      success: false,
      message,
      statusCode,
      status: 'Failed'
    };
  }
}

export default ApiResponse;

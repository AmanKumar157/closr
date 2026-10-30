export class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.data = data;
    this.message = message;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      data: this.data,
      message: this.message
    });
  }
}


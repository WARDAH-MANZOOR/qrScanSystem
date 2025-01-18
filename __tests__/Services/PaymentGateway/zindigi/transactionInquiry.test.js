import axios from 'axios';
import { CustomError } from '../../../../dist/utils/custom_error.js'; // Replace with actual path
import zindigiService from '../../../../dist/services/paymentGateway/zindigi.js'; // Replace with actual path
jest.mock('axios'); // Mock axios globally
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });

describe('transactionInquiry', () => {
  it('should return response data when the API returns a successful response', async () => {
    // Arrange
    const body = { transactionId: '12345' };
    const mockResponse = { data: { status: 'success', transactionId: '12345' } };
    axios.request.mockResolvedValue(mockResponse);  // Mocking successful API response

    // Act
    const result = await zindigiService.transactionInquiry(body);

    // Assert
    expect(result).toEqual(mockResponse.data);
    expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'post',
      url: 'https://z-sandbox.jsbl.com/zconnect/api/v1/transactionStatus',
      headers: {
        clientId: '1',
        clientSecret: '1',
        organizationId: '1',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({ transactionStatusReq: body }),
    }));
  });

  it('should throw CustomError when the API returns an error', async () => {
    // Arrange
    const body = { transactionId: '12345' };
    const mockError = new Error('API error');
    axios.request.mockRejectedValue(mockError);  // Mocking API error response

    // Act & Assert
    await expect(zindigiService.transactionInquiry(body)).rejects.toThrowError(CustomError);
    await expect(zindigiService.transactionInquiry(body)).rejects.toThrowError('An Error has occured');
  });

  it('should throw CustomError for invalid body input', async () => {
    // Arrange
    const body = {};  // Invalid body (empty object)
    const mockError = new Error('Invalid body');
    axios.request.mockRejectedValue(mockError);  // Mocking API error

    // Act & Assert
    await expect(zindigiService.transactionInquiry(body)).rejects.toThrowError(CustomError);
    await expect(zindigiService.transactionInquiry(body)).rejects.toThrowError('An Error has occured');
  });

  it('should throw CustomError if headers are missing or incorrect', async () => {
    // Arrange
    const body = { transactionId: '12345' };
    const mockError = new Error('Invalid headers');
    axios.request.mockRejectedValue(mockError);  // Mocking API error

    // Act & Assert
    await expect(zindigiService.transactionInquiry(body)).rejects.toThrowError(CustomError);
    await expect(zindigiService.transactionInquiry(body)).rejects.toThrowError('An Error has occured');
  });

  it('should pass correct configuration to axios', async () => {
    // Arrange
    const body = { transactionId: '12345' };
    const mockResponse = { data: { status: 'success', transactionId: '12345' } };
    axios.request.mockResolvedValue(mockResponse);  // Mocking successful response

    // Act
    await zindigiService.transactionInquiry(body);

    // Assert
    expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'post',
      url: 'https://z-sandbox.jsbl.com/zconnect/api/v1/transactionStatus',
      headers: {
        clientId: '1',
        clientSecret: '1',
        organizationId: '1',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({ transactionStatusReq: body }),
    }));
  });
});

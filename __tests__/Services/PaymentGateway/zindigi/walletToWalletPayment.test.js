import axios from 'axios';
import zindigiService from '../../../../dist/services/paymentGateway/zindigi.js';
import { CustomError } from '../../../../dist/utils/custom_error.js'; // Replace with actual path

jest.mock('axios'); // Mock axios globally

describe('walletToWalletPayment', () => {
  const clientInfo = {
    clientSecret: 'mockClientSecret',
    organizationId: 'mockOrganizationId',
  };

  const body = {
    mobile: '03320354357',
    amount: 1000,
  };

  beforeEach(() => {
    axios.post.mockClear(); // Clear previous mocks before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error

  });
  
  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });

  test('should return success and data when response has errorcode not "0000"', async () => {
    const mockResponse = {
      data: {
        errorcode: '0001', // Simulating non-0000 errorcode
        message: 'Success',
      },
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    const result = await zindigiService.walletToWalletPayment(body, clientInfo);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse.data);
    expect(axios.post).toHaveBeenCalledTimes(1); // Expecting one call
  });

  test('should return failure when errorcode is "0000"', async () => {
    const mockResponse = {
      data: {
        errorcode: '0000', // Simulating errorcode "0000"
      },
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    const result = await zindigiService.walletToWalletPayment(body, clientInfo);

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(axios.post).toHaveBeenCalledTimes(1); // Expecting one call
  });

  test('should throw a CustomError when the API call fails', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Error'));

    await expect(zindigiService.walletToWalletPayment(body, clientInfo)).rejects.toThrow(CustomError);
    expect(axios.post).toHaveBeenCalledTimes(1); // Expecting one call
  });

  test('should handle errors thrown by the API gracefully', async () => {
    const mockError = new Error('API Error');
    axios.post.mockRejectedValueOnce(mockError);

    await expect(zindigiService.walletToWalletPayment(body, clientInfo)).rejects.toThrowError('An Error has occured');
    expect(axios.post).toHaveBeenCalledTimes(1); // Expecting one call
  });

  test('should throw an error if required fields are missing in the request body', async () => {
    const invalidBody = {
      mobile: '', // Missing mobile or amount
      amount: 0,
    };

    const mockResponse = {
      data: {
        errorcode: '0001',
        message: 'Missing required fields',
      },
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    const result = await zindigiService.walletToWalletPayment(invalidBody, clientInfo);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse.data);
    expect(axios.post).toHaveBeenCalledTimes(1); // Expecting one call
  });
});

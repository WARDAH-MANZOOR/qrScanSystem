import axios from 'axios';
import { CustomError } from '../../../../dist/utils/custom_error.js'; // Replace with actual path
import zindigiService from '../../../../dist/seyrvices/paymentGateway/zindigi.js'; // Replace with actual path

jest.mock('axios'); // Mock axios globally

beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });

describe('debitInquiry', () => {
    const body = {
        accountNumber: '123456789',
        debitAmount: 1000,
    };

    test('should return data when API call is successful', async () => {
        const mockResponse = {
            data: {
                statusCode: '0000', // Simulating a successful response
                message: 'Success',
            },
        };

        axios.post.mockResolvedValueOnce(mockResponse);

        const result = await zindigiService.debitInquiry(body);

        expect(result).toEqual(mockResponse.data);
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('should throw CustomError when API call fails due to network error', async () => {
        axios.post.mockRejectedValueOnce(new Error('Network Error'));

        await expect(zindigiService.debitInquiry(body)).rejects.toThrow(CustomError);
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('should handle error response with error code', async () => {
        const mockResponse = {
            data: {
                statusCode: '5000', // Simulating an error response
                message: 'Internal Server Error',
            },
        };

        axios.post.mockResolvedValueOnce(mockResponse);

        const result = await zindigiService.debitInquiry(body);

        expect(result.statusCode).toBe('5000');
        expect(result.message).toBe('Internal Server Error');
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('should throw a CustomError when there is an API error', async () => {
        const mockError = new Error('API Error');
        axios.post.mockRejectedValueOnce(mockError);

        await expect(zindigiService.debitInquiry(body)).rejects.toThrowError('An Error has occured');
        expect(axios.post).toHaveBeenCalledTimes(1);
    });
    
});

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

describe('debitPayment', () => {

    // Test Case 1: Successful payment
    it('should return response data on successful payment', async () => {
        // Arrange
        const body = { amount: 100, account: '123456' };
        const initiateResponse = { transactionId: 'tx123' };
        const mockResponse = { data: { status: 'success', message: 'Payment processed successfully' } };
        
        // Mock axios.post to resolve with a mock response
        axios.post.mockResolvedValue(mockResponse);

        // Act
        const result = await zindigiService.debitPayment(body, initiateResponse);

        // Assert
        expect(result).toEqual(mockResponse.data);
        expect(axios.post).toHaveBeenCalledWith(
            'https://z-sandbox.jsbl.com/zconnect/api/v2/debitpayment-blb2',
            { DebitPaymentRequest: { ...body, ...initiateResponse } },
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'clientId': '364E9806o51K9',
                    'clientSecret': expect.any(String),
                    'organizationId': '223'
                })
            })
        );
    });

    // Test Case 2: Payment fails due to API error
    it('should throw an error if the payment fails', async () => {
        // Arrange
        const body = { amount: 100, account: '123456' };
        const initiateResponse = { transactionId: 'tx123' };
        const mockError = new Error('Network Error');
        
        // Mock axios.post to reject with a mock error
        axios.post.mockRejectedValue(mockError);

        // Act & Assert
        await expect(zindigiService.debitPayment(body, initiateResponse)).rejects.toThrowError(CustomError);
        await expect(zindigiService.debitPayment(body, initiateResponse)).rejects.toThrow('An Error has occured');
    });


    // Test Case 3: Network error
    it('should handle network errors properly', async () => {
        // Arrange
        const body = { amount: 100, account: '123456' };
        const initiateResponse = { transactionId: 'tx123' };
        
        // Mock axios.post to reject with a network error
        axios.post.mockRejectedValue(new Error('Network Error'));

        // Act & Assert
        await expect(zindigiService.debitPayment(body, initiateResponse)).rejects.toThrow('An Error has occured');
    });

    // Test Case 4: Missing required parameters in request body
    it('should throw an error if the required parameters are missing in the request body', async () => {
        // Arrange
        const body = { amount: 100 };  // Missing 'account'
        const initiateResponse = { transactionId: 'tx123' };
        
        // Act & Assert
        await expect(zindigiService.debitPayment(body, initiateResponse)).rejects.toThrow('An Error has occured');
    });

});

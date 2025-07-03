
import paymentRequestController from '../../../dist/controller/paymentRequest/index.js'; // Controller function
import { paymentRequestService } from '../../../dist/services/index.js'; // Service function
import ApiResponse from '../../../dist/utils/ApiResponse.js'; // ApiResponse utility

jest.mock('../../../dist/services/index.js'); // Mock the service layer

describe('createPaymentRequest', () => {
    const mockReq = {
        body: { amount: 100, currency: 'USD', description: 'Test payment' },
        user: { id: 'user123', role: 'user' },
    };

    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };

    const mockNext = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully create a payment request and return 200 with the response', async () => {
        const mockResponse = { id: 'payment123', status: 'success', ...mockReq.body };
        paymentRequestService.createPaymentRequest.mockResolvedValue(mockResponse);

        await paymentRequestController.createPaymentRequest(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockResponse));
        expect(paymentRequestService.createPaymentRequest).toHaveBeenCalledWith(mockReq.body, mockReq.user);
    });

    it('should call next with an error when the service throws an error', async () => {
        const mockError = new Error('Service error');
        paymentRequestService.createPaymentRequest.mockRejectedValue(mockError);

        await paymentRequestController.createPaymentRequest(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(mockError);
    });

});

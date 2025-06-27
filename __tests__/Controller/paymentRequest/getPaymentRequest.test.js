import paymentRequestController from '../../../dist/controller/paymentRequest/index.js'; // Controller function
import { paymentRequestService } from '../../../dist/services/index.js'; // Service function
import ApiResponse from '../../../dist/utils/ApiResponse.js'; // ApiResponse utility

jest.mock('../../../dist/services/index.js'); // Mock the service layer

describe('getPaymentRequest', () => {
    const mockReq = {
        query: { status: 'pending' },
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

    it('should successfully fetch payment requests and return 200 with the response', async () => {
        const mockResponse = [{ id: 'payment123', status: 'pending', user: mockReq.user.id }];
        paymentRequestService.getPaymentRequest.mockResolvedValue(mockResponse);

        await paymentRequestController.getPaymentRequest(mockReq, mockRes, mockNext);

        expect(mockReq.query.user).toEqual(mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockResponse));
        expect(paymentRequestService.getPaymentRequest).toHaveBeenCalledWith(mockReq.query);
    });

    it('should call next with an error when the service throws an error', async () => {
        const mockError = new Error('Service error');
        paymentRequestService.getPaymentRequest.mockRejectedValue(mockError);

        await paymentRequestController.getPaymentRequest(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(mockError);
    });

});

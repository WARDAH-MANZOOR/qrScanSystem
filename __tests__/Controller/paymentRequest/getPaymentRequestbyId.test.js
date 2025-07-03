import paymentRequestController from '../../../dist/controller/paymentRequest/index.js'; // Controller function
import { paymentRequestService } from '../../../dist/services/index.js'; // Service function
import ApiResponse from '../../../dist/utils/ApiResponse.js'; // ApiResponse utility


jest.mock('../../../dist/services/index.js'); // Mock the service layer

describe('getPaymentRequestbyId', () => {
    const mockReq = {
        params: { id: 'payment123' },
    };

    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };

    const mockNext = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully fetch a payment request by ID and return 200 with the response', async () => {
        const mockResponse = { id: 'payment123', status: 'pending' };
        paymentRequestService.getPaymentRequestbyId.mockResolvedValue(mockResponse);

        await paymentRequestController.getPaymentRequestbyId(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockResponse));
        expect(paymentRequestService.getPaymentRequestbyId).toHaveBeenCalledWith(mockReq.params.id);
    });

    it('should throw an error if payment request ID is missing', async () => {
        const missingIdReq = { params: {} };

        await paymentRequestController.getPaymentRequestbyId(missingIdReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Payment request ID is required',
                statusCode: 400,
            })
        );
        expect(paymentRequestService.getPaymentRequestbyId).not.toHaveBeenCalled();
    });

    it('should call next with an error if the service throws an error', async () => {
        const mockError = new Error('Service error');
        paymentRequestService.getPaymentRequestbyId.mockRejectedValue(mockError);

        await paymentRequestController.getPaymentRequestbyId(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(mockError);
    });
});

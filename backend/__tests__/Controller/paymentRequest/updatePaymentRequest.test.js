import paymentRequestController from '../../../dist/controller/paymentRequest/index.js'; // Controller function
import { paymentRequestService } from '../../../dist/services/index.js'; // Service function
import ApiResponse from '../../../dist/utils/ApiResponse.js'; // ApiResponse utility

jest.mock('../../../dist/services/index.js'); // Mock the service layer

describe('updatePaymentRequest', () => {
    const mockReq = {
        params: { paymentRequestId: 'payment123' },
        body: { status: 'completed' },
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

    it('should successfully update a payment request and return 200 with the response', async () => {
        const mockResponse = { id: 'payment123', status: 'completed' };
        paymentRequestService.updatePaymentRequest.mockResolvedValue(mockResponse);

        await paymentRequestController.updatePaymentRequest(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockResponse));
        expect(paymentRequestService.updatePaymentRequest).toHaveBeenCalledWith(
            mockReq.params.paymentRequestId,
            mockReq.body,
            mockReq.user
        );
    });

    it('should throw an error if paymentRequestId is missing', async () => {
        const missingIdReq = { ...mockReq, params: {} };

        await paymentRequestController.updatePaymentRequest(missingIdReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Payment request ID is required',
                statusCode: 400,
            })
        );
        expect(paymentRequestService.updatePaymentRequest).not.toHaveBeenCalled();
    });

    it('should throw an error if request body is empty', async () => {
        const emptyBodyReq = { ...mockReq, body: {} };

        await paymentRequestController.updatePaymentRequest(emptyBodyReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Request body is required',
                statusCode: 400,
            })
        );
        expect(paymentRequestService.updatePaymentRequest).not.toHaveBeenCalled();
    });

    it('should call next with an error if the service throws an error', async () => {
        const mockError = new Error('Service error');
        paymentRequestService.updatePaymentRequest.mockRejectedValue(mockError);

        await paymentRequestController.updatePaymentRequest(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(mockError);
    });
});

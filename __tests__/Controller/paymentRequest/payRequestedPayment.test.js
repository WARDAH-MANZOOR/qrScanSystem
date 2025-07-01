import paymentRequestController from '../../../dist/controller/paymentRequest/index.js'; // Controller function
import { paymentRequestService } from '../../../dist/services/index.js'; // Service function
import ApiResponse from '../../../dist/utils/ApiResponse.js'; // ApiResponse utility

jest.mock('../../../dist/services/index.js'); // Mock the service layer

describe('payRequestedPayment', () => {
    const mockReq = {
        body: { payId: 'payment123', accountNo: '1234567890' },
    };

    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };

    const mockNext = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully process the payment request and return 200 with the response', async () => {
        const mockResponse = { success: true };
        paymentRequestService.payRequestedPayment.mockResolvedValue(mockResponse);

        await paymentRequestController.payRequestedPayment(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockResponse));
        expect(paymentRequestService.payRequestedPayment).toHaveBeenCalledWith(mockReq.body);
    });

    it('should throw an error if payId is missing', async () => {
        const missingPayIdReq = { body: { accountNo: '1234567890' } };

        await paymentRequestController.payRequestedPayment(missingPayIdReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Payment request ID is required',
                statusCode: 400,
            })
        );
        expect(paymentRequestService.payRequestedPayment).not.toHaveBeenCalled();
    });

    it('should throw an error if accountNo is missing', async () => {
        const missingAccountNoReq = { body: { payId: 'payment123' } };

        await paymentRequestController.payRequestedPayment(missingAccountNoReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Account number is required',
                statusCode: 400,
            })
        );
        expect(paymentRequestService.payRequestedPayment).not.toHaveBeenCalled();
    });

    it('should call next with an error if the service throws an error', async () => {
        const mockError = new Error('Service error');
        paymentRequestService.payRequestedPayment.mockRejectedValue(mockError);

        await paymentRequestController.payRequestedPayment(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(mockError);
    });
});

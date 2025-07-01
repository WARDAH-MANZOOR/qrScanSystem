import  transactionController  from '../../../../dist/controller/transactions/index.js';
import { jazzCashService } from '../../../../dist/services/index.js';
import ApiResponse from '../../../../dist/utils/ApiResponse.js';
import CustomError from '../../../../dist/utils/custom_error.js';

jest.mock('../../../../dist/services/index.js');
jest.mock('../../../../dist/utils/custom_error.js');
jest.mock('../../../../dist/utils/ApiResponse.js');

describe('createTransaction', () => {
    const mockReq = {
        body: {
            amount: 100,
            currency: 'PKR',
            transactionType: 'purchase',
            customerName: 'John Doe',
            customerEmail: 'johndoe@example.com',
        },
        user: { id: 'M123' },
    };
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };
    const mockNext = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initiate JazzCash payment and return a success response', async () => {
        const mockPaymentResponse = { success: true, message: 'Payment initiated successfully' };
        jazzCashService.initiateJazzCashPayment.mockResolvedValue(mockPaymentResponse);

        await transactionController.createTransaction(mockReq, mockRes, mockNext);

        expect(jazzCashService.initiateJazzCashPayment).toHaveBeenCalledWith(mockReq.body);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockPaymentResponse));
    });

    it('should call next with error if JazzCash payment initiation fails', async () => {
        const mockError = new Error('Payment initiation failed');
        jazzCashService.initiateJazzCashPayment.mockRejectedValue(mockError);

        await transactionController.createTransaction(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(mockError);
    });
});

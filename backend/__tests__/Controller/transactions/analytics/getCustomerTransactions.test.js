import transactionController from '../../../../dist/controller/transactions/analytics.js';
import { transactionService } from '../../../../dist/services/index.js';
import ApiResponse from '../../../../dist/utils/ApiResponse.js';

jest.mock('../../../../dist/services/index.js'); // Mock the service layer

describe('getCustomerTransactions', () => {
    const mockReq = {
        user: { id: 'user123' },
    };

    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };

    const mockNext = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully fetch customer transactions and return 200 with the response', async () => {
        const mockTransactions = [{ id: 'transaction123', amount: 100 }];
        transactionService.getCustomerTransactions.mockResolvedValue(mockTransactions);

        await transactionController.getCustomerTransactions(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockTransactions));
        expect(transactionService.getCustomerTransactions).toHaveBeenCalledWith({ id: mockReq.user.id });
    });

    it('should return 500 and an error response if the service throws an error', async () => {
        const mockError = new Error('Service error');
        transactionService.getCustomerTransactions.mockRejectedValue(mockError);

        await transactionController.getCustomerTransactions(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error"));
    });
});

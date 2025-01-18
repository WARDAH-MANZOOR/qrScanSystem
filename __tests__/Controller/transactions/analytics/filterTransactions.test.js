import transactionController from '../../../../dist/controller/transactions/analytics.js';
import { transactionService } from '../../../../dist/services/index.js';
import ApiResponse from '../../../../dist/utils/ApiResponse.js';

jest.mock('../../../../dist/services/index.js'); // Mock the service layer

describe('filterTransactions', () => {
    const mockReq = {
        query: { status: 'pending' },
        user: { id: 'user123', role: 'admin' },
    };

    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };

    const mockNext = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully fetch filtered transactions and return 200 with the response', async () => {
        const mockResponse = [{ id: 'transaction123', status: 'pending' }];
        transactionService.filterTransactions.mockResolvedValue(mockResponse);

        await transactionController.filterTransactions(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockResponse));
        expect(transactionService.filterTransactions).toHaveBeenCalledWith(mockReq.query, mockReq.user);
    });

    it('should call next with an error if the service throws an error', async () => {
        const mockError = new Error('Service error');
        transactionService.filterTransactions.mockRejectedValue(mockError);

        await transactionController.filterTransactions(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(mockError);
    });
});

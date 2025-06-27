import transactionController from '../../../../dist/controller/transactions/analytics.js';
import { transactionService } from '../../../../dist/services/index.js';
import ApiResponse from '../../../../dist/utils/ApiResponse.js';

jest.mock('../../../../dist/services/index.js'); // Mock the service layer

describe('getDashboardSummary', () => {
    const mockReq = {
        query: { dateRange: 'last30days' },
    };

    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };

    const mockNext = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully fetch the dashboard summary and return 200 with the response', async () => {
        const mockResponse = { totalTransactions: 100, totalAmount: 5000 };
        transactionService.getDashboardSummary.mockResolvedValue(mockResponse);

        await transactionController.getDashboardSummary(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockResponse));
        expect(transactionService.getDashboardSummary).toHaveBeenCalledWith(mockReq.query);
    });

    it('should call next with an error if the service throws an error', async () => {
        const mockError = new Error('Service error');
        transactionService.getDashboardSummary.mockRejectedValue(mockError);

        await transactionController.getDashboardSummary(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(mockError);
    });
});

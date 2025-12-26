import {getSettlements} from '../../../dist/controller/settlement/index.js';
import { getSettlement } from '../../../dist/services/settlement/index.js';
import ApiResponse from '../../../dist/utils/ApiResponse.js';
jest.mock('../../../dist/services/settlement/index.js', () => ({
    getSettlement: jest.fn(),
}));


describe('getSettlements', () => {
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

    it('should successfully fetch settlements and return 200 with the response', async () => {
        const mockResponse = [{ id: 'settlement123', status: 'pending' }];
        getSettlement.mockResolvedValue(mockResponse);

        await getSettlements(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockResponse));
        expect(getSettlement).toHaveBeenCalledWith(mockReq.query, mockReq.user);
    });

    it('should return 400 and an error response if the service throws an error', async () => {
        const mockError = new Error('Service error');
        mockError.statusCode = 500;
        getSettlement.mockRejectedValue(mockError);

        await getSettlements(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error(mockError.message, mockError.statusCode));
    });
});

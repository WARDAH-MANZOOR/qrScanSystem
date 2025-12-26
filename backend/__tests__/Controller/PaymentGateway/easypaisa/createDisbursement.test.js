import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import createDisbursementController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock('../../../../dist/services/paymentGateway/easypaisa.js');

describe('createDisbursement Controller', () => {

    it('should return 200 and the result on successful disbursement creation', async () => {
        // Mock the service to return a success result
        const mockDisbursementResult = { transactionId: '12345', status: 'success' };
        easyPaisaService.createDisbursement.mockResolvedValue(mockDisbursementResult);

        // Mock the req and res objects
        const req = {
            params: { merchantId: '1' },
            body: { amount: 1000, accountNumber: '1234567890' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await createDisbursementController.createDisbursement(req, res, next);

        // Check if the response is returned correctly
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockDisbursementResult));
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when an exception is thrown', async () => {
        const mockReq = {
            params: { merchantId: '12345' },
            body: { amount: 1000, description: 'Test' },
        };
        const mockRes = {};
        const mockNext = jest.fn();

        const mockError = new Error('Something went wrong');
        
        easyPaisaService.createDisbursement.mockRejectedValue(mockError);

        await createDisbursementController.createDisbursement(mockReq, mockRes, mockNext);
        
        // Assertions
        expect(easyPaisaService.createDisbursement).toHaveBeenCalledWith(
            mockReq.body,
            mockReq.params.merchantId
        );
        expect(mockNext).toHaveBeenCalledWith(mockError);
    });
});

    



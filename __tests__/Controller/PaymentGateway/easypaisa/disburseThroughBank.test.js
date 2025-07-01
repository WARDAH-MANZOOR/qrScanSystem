import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import disburseThroughBankController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock('../../../../dist/services/paymentGateway/easypaisa.js');

describe('disburseThroughBank Controller', () => {
    
    it('should return 200 and the result on successful disbursement', async () => {
        // Mock successful result from service
        const mockDisbursementResult = { transactionId: '12345', status: 'success' };
        easyPaisaService.disburseThroughBank.mockResolvedValue(mockDisbursementResult);

        // Mock the req, res, and next objects
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
        await disburseThroughBankController.disburseThroughBank(req, res, next);

        // Assertions
        expect(easyPaisaService.disburseThroughBank).toHaveBeenCalledWith(req.body, '1');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockDisbursementResult));
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when the service throws an exception', async () => {
        // Mock an error from the service
        const mockError = new Error('Disbursement failed');
        easyPaisaService.disburseThroughBank.mockRejectedValue(mockError);

        // Mock the req, res, and next objects
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
        await disburseThroughBankController.disburseThroughBank(req, res, next);

        // Assertions
        expect(easyPaisaService.disburseThroughBank).toHaveBeenCalledWith(req.body, '1');
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

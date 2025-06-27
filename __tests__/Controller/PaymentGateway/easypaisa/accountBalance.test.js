import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import accountBalanceController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock('../../../../dist/services/paymentGateway/easypaisa.js');

describe('accountBalance Controller', () => {

    it('should return 200 and the result on successful account balance retrieval', async () => {
        // Mock successful result from service
        const mockAccountBalanceResult = { balance: 1000 };
        easyPaisaService.accountBalance.mockResolvedValue(mockAccountBalanceResult);

        // Mock the req, res, and next objects
        const req = {
            params: { merchantId: '1' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await accountBalanceController.accountBalance(req, res, next);

        // Assertions
        expect(easyPaisaService.accountBalance).toHaveBeenCalledWith('1');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockAccountBalanceResult));
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when the service throws an exception', async () => {
        // Mock an error from the service
        const mockError = new Error('Failed to retrieve account balance');
        easyPaisaService.accountBalance.mockRejectedValue(mockError);

        // Mock the req, res, and next objects
        const req = {
            params: { merchantId: '1' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await accountBalanceController.accountBalance(req, res, next);

        // Assertions
        expect(easyPaisaService.accountBalance).toHaveBeenCalledWith('1');
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

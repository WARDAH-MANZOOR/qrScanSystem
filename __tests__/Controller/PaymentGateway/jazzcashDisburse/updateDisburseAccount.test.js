import jazzcashDisburse from "../../../../dist/services/paymentGateway/jazzcashDisburse.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import jazzCashDisburseController from '../../../../dist/controller/paymentGateway/jazzcashDisburse.js'; // Controller function

jest.mock("../../../../dist/services/paymentGateway/jazzcashDisburse.js", () => ({
    updateDisburseAccount: jest.fn(),
}));

describe('updateDisburseAccount Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should update a disburse account and return success response', async () => {
        // Mock the successful update response
        const mockResult = { accountId: 123, status: 'Updated' };
        jazzcashDisburse.updateDisburseAccount.mockResolvedValue(mockResult);

        // Mock the req and res objects
        const req = {
            params: { accountId: '123' },
            body: { accountName: 'Updated Account', accountNumber: '0987654321' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await jazzCashDisburseController.updateDisburseAccount(req, res, next);

        // Verify the correct response
        expect(jazzcashDisburse.updateDisburseAccount).toHaveBeenCalledWith(
            '123',
            { accountName: 'Updated Account', accountNumber: '0987654321' }
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
        expect(next).not.toHaveBeenCalled();
    });

    it('should handle server errors gracefully', async () => {
        // Mock an error thrown by the service
        const mockError = new Error('Server error');
        jazzcashDisburse.updateDisburseAccount.mockRejectedValue(mockError);

        // Mock the req and res objects
        const req = {
            params: { accountId: '123' },
            body: { accountName: 'Updated Account', accountNumber: '0987654321' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await jazzCashDisburseController.updateDisburseAccount(req, res, next);

        // Verify error handling
        expect(jazzcashDisburse.updateDisburseAccount).toHaveBeenCalledWith(
            '123',
            { accountName: 'Updated Account', accountNumber: '0987654321' }
        );
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

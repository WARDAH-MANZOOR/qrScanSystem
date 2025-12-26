import jazzcashDisburse from "../../../../dist/services/paymentGateway/jazzcashDisburse.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import jazzCashDisburseController from '../../../../dist/controller/paymentGateway/jazzcashDisburse.js'; // Controller function

jest.mock("../../../../dist/services/paymentGateway/jazzcashDisburse.js");

describe('deleteDisburseAccount Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delete a disburse account and return success response', async () => {
        const mockResult = {
            message: 'Operation successful',
            data: {},
        };
        jazzcashDisburse.deleteDisburseAccount = jest.fn().mockResolvedValue(mockResult);
    
        const req = {
            params: { accountId: '123' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();
    
        await jazzCashDisburseController.deleteDisburseAccount(req, res, next);
    
        expect(jazzcashDisburse.deleteDisburseAccount).toHaveBeenCalledWith('123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            statusCode: 200,
            success: true,
            message: 'Operation successful',
            data: {},
        });
        expect(next).not.toHaveBeenCalled();
    });
    

    it('should handle server errors gracefully', async () => {
        // Mock the error thrown by the service
        const mockError = new Error('Server error');
        jazzcashDisburse.deleteDisburseAccount = jest.fn().mockRejectedValue(mockError);

        // Mock the req and res objects
        const req = {
            params: { accountId: '123' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await jazzCashDisburseController.deleteDisburseAccount(req, res, next);

        // Check if the error is passed to next middleware
        expect(jazzcashDisburse.deleteDisburseAccount).toHaveBeenCalledWith('123');
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

import disburseAccountController from '../../../../dist/controller/paymentGateway/easyPaisaDisburse.js'; // Controller function
import { easyPaisaDisburse } from '../../../../dist/services/index.js'; // Service function
import ApiResponse from '../../../../dist/utils/ApiResponse.js'; // ApiResponse utility

describe('getDisburseAccount Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                accountId: '1234567890' // Example accountId
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    it('should return 200 and success response when getDisburseAccount succeeds', async () => {
        // Arrange: Mock the successful response of the service
        const mockResult = {
            message: 'Operation successful', // Make sure this matches the actual message from the service
            statusCode: 200,
            success: true,
            data: { account_number: '1234567890', account_holder_name: 'John Doe' }
        };
        easyPaisaDisburse.getDisburseAccount = jest.fn().mockResolvedValue(mockResult);

        // Act: Call the controller function
        await disburseAccountController.getDisburseAccount(req, res, next);

        // Assert: Check that the response is correct
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult)); // Ensure this matches mockResult
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when getDisburseAccount fails', async () => {
        // Arrange: Mock the error scenario
        const mockError = new Error('Account not found');
        easyPaisaDisburse.getDisburseAccount = jest.fn().mockRejectedValue(mockError);

        // Act: Call the controller function
        await disburseAccountController.getDisburseAccount(req, res, next);

        // Assert: Check that the error is passed to the next middleware
        expect(next).toHaveBeenCalledWith(mockError);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});

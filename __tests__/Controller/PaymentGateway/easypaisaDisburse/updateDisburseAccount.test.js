import updateDisburseAccountController from '../../../../dist/controller/paymentGateway/easyPaisaDisburse.js'; // Controller function
import { easyPaisaDisburse } from '../../../../dist/services/index.js'; // Service function
import ApiResponse from '../../../../dist/utils/ApiResponse.js'; // ApiResponse utility

describe('updateDisburseAccount Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                accountId: '1234567890' // Example accountId
            },
            body: {
                account_holder_name: 'John Doe Updated',
                account_number: '1234567890',
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    it('should return 200 and success response when updateDisburseAccount succeeds', async () => {
        // Arrange: Mock the successful response of the service
        const mockResult = {
            message: 'Account updated successfully', // Ensure this matches the service response
            statusCode: 200,
            success: true,
            data: { account_number: '1234567890', account_holder_name: 'John Doe Updated' }
        };

        easyPaisaDisburse.updateDisburseAccount = jest.fn().mockResolvedValue(mockResult);

        // Act: Call the controller function
        await updateDisburseAccountController.updateDisburseAccount(req, res, next);

        // Assert: Check that the response is correct
        // Expected format after ApiResponse.success() wraps the result.
        const expectedResponse = {
            success: true,
            message: 'Account updated successfully',
            statusCode: 200,
            data: mockResult.data
        };

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(expectedResponse)); // Ensure this matches expected response
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when updateDisburseAccount fails', async () => {
        // Arrange: Mock the error scenario
        const mockError = new Error('Failed to update account');
        easyPaisaDisburse.updateDisburseAccount = jest.fn().mockRejectedValue(mockError);

        // Act: Call the controller function
        await updateDisburseAccountController.updateDisburseAccount(req, res, next);

        // Assert: Check that the error is passed to the next middleware
        expect(next).toHaveBeenCalledWith(mockError);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});

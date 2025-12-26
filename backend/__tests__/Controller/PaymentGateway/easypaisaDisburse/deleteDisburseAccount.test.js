import deleteDisburseAccountController from '../../../../dist/controller/paymentGateway/easyPaisaDisburse.js'; // Controller function
import { easyPaisaDisburse } from '../../../../dist/services/index.js'; // Service function
import ApiResponse from '../../../../dist/utils/ApiResponse.js'; // ApiResponse utility

describe('deleteDisburseAccount Controller', () => {
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

    it('should return 200 and success response when deleteDisburseAccount succeeds', async () => {
        // Arrange: Mock the successful response of the service
        const mockResult = {
            message: 'Account deleted successfully', // Ensure this matches the service response
            statusCode: 200,
            success: true,
            data: null // Since it’s a delete operation, the data is likely to be null
        };
        easyPaisaDisburse.deleteDisburseAccount = jest.fn().mockResolvedValue(mockResult);

        // Act: Call the controller function
        await deleteDisburseAccountController.deleteDisburseAccount(req, res, next);

        // Assert: Check that the response is correct
        const expectedResponse = {
            success: true,
            message: 'Account deleted successfully',
            statusCode: 200,
            data: null // The data might be null for delete operations
        };

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(expectedResponse)); // Ensure this matches expected response
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when deleteDisburseAccount fails', async () => {
        // Arrange: Mock the error scenario
        const mockError = new Error('Failed to delete account');
        easyPaisaDisburse.deleteDisburseAccount = jest.fn().mockRejectedValue(mockError);

        // Act: Call the controller function
        await deleteDisburseAccountController.deleteDisburseAccount(req, res, next);

        // Assert: Check that the error is passed to the next middleware
        expect(next).toHaveBeenCalledWith(mockError);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});

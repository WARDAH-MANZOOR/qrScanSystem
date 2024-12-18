import disburseAccountController from '../dist/controller/paymentGateway/easyPaisaDisburse.js'; // Controller function
import { easyPaisaDisburse } from '../dist/services/index.js'; // Service function
import ApiResponse from '../dist/utils/ApiResponse.js'; // ApiResponse utility
import CustomError from '../dist/utils/custom_error.js'; // Custom error handling
import { mockRequest, mockResponse } from 'jest-mock-req-res'; // Utility for mocking req/res

jest.mock('../dist/services/index.js', () => ({
    easyPaisaDisburse: {
        addDisburseAccount: jest.fn(),  // Mock the specific function
    }
}));

jest.mock('../dist/utils/ApiResponse.js'); // Mock ApiResponse utility
jest.mock('../dist/prisma/client.js'); // Mock Prisma client

describe('addDisburseAccount Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = mockRequest();
        res = mockResponse();
        next = jest.fn();
    });

    it('should successfully add a disburse account', async () => {
        // Arrange
        const accountData = {
            MSISDN: '123456789',
            clientId: 'client-id',
            clientSecret: 'client-secret',
            xChannel: 'x-channel',
            pin: '1234'
        };

        req.body = accountData;
        const mockResponseData = {
            message: "Disburse account created successfully",
            data: {
                id: 1,
                ...accountData
            }
        };

        easyPaisaDisburse.addDisburseAccount.mockResolvedValue(mockResponseData); // Mock the service call

        ApiResponse.success = jest.fn().mockReturnValue(mockResponseData); // Mock the success response from ApiResponse

        // Act
        await disburseAccountController.addDisburseAccount(req, res, next);

        // Assert
        expect(easyPaisaDisburse.addDisburseAccount).toHaveBeenCalledWith(accountData);
        expect(ApiResponse.success).toHaveBeenCalledWith(mockResponseData);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockResponseData);
    });

    it('should handle error when service fails to create disburse account', async () => {
        // Arrange
        const accountData = {
            MSISDN: '123456789',
            clientId: 'client-id',
            clientSecret: 'client-secret',
            xChannel: 'x-channel',
            pin: '1234'
        };

        req.body = accountData;

        const error = new CustomError("An error occurred while creating the disburse account", 500);
        easyPaisaDisburse.addDisburseAccount.mockRejectedValue(error); // Mock service error

        // Act
        await disburseAccountController.addDisburseAccount(req, res, next);

        // Assert
        expect(easyPaisaDisburse.addDisburseAccount).toHaveBeenCalledWith(accountData);
        expect(next).toHaveBeenCalledWith(error); // Error should be passed to the next middleware
    });

    it('should handle missing fields in the request body', async () => {
        // Arrange
        req.body = {}; // Empty request body

        const error = new CustomError("Validation error: Missing required fields", 400);
        easyPaisaDisburse.addDisburseAccount.mockRejectedValue(error); // Mock service error

        // Act
        await disburseAccountController.addDisburseAccount(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledWith(error); // Error should be passed to the next middleware
    });
});
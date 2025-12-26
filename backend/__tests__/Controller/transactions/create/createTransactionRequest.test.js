import { createTransactionRequest } from '../../../../dist/controller/transactions/create.js';
import { createTransaction } from '../../../../dist/services/transactions/create.js';
import ApiResponse from '../../../../dist/utils/ApiResponse.js';
import CustomError from '../../../../dist/utils/custom_error.js';
import { validationResult } from 'express-validator';
import { body } from 'express-validator';

jest.mock('../../../../dist/services/transactions/create.js');
jest.mock('../../../../dist/utils/custom_error.js');
jest.mock('express-validator', () => ({
    body: jest.fn().mockReturnValue({
        isEmail: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis(),
        isString: jest.fn().mockReturnThis(),
        isFloat: jest.fn().mockReturnThis(),
        isIn: jest.fn().mockReturnThis(),
        notEmpty: jest.fn().mockReturnThis(),
        matches: jest.fn().mockReturnThis(),
        normalizeEmail: jest.fn().mockReturnThis(),
        isLength: jest.fn().mockReturnThis(),
    }),
    validationResult: jest.fn().mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(true),  // Default to no validation errors
        array: jest.fn().mockReturnValue([]),     // Empty error array
    }),
}));
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe('createTransactionRequest', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            body: {
                id: '123',
                original_amount: 100,
                type: 'credit',
                customerName: 'John Doe',
                customerEmail: 'john.doe@example.com',
                order_id: 'ORD12345',
            },
            user: { id: 'MERCHANT123' }, // Mock authenticated user with a merchant ID
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    it('should return 401 if merchant is unauthorized', async () => {
        mockReq.user = null; // Simulate an unauthorized user

        await createTransactionRequest(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error("Unauthorized"));
    });

    it('should return 201 and create a transaction if everything is valid', async () => {
        const mockTransaction = {
            transaction_id: 'ORD12345',
            id: '123',
            original_amount: 100,
            status: 'pending',
            type: 'credit',
            merchant_id: 'MERCHANT123',
            customerName: 'John Doe',
            customerEmail: 'john.doe@example.com',
        };

        createTransaction.mockResolvedValue(mockTransaction);

        await createTransactionRequest(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockTransaction));
        expect(createTransaction).toHaveBeenCalledWith(expect.objectContaining({
            id: '123',
            original_amount: 100,
            type: 'credit',
        }));
    });

    it('should return 500 if an error occurs during transaction creation', async () => {
        createTransaction.mockRejectedValue(new Error('Something went wrong'));

        await createTransactionRequest(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error"));
    });


    it('should return a generic internal server error response for other errors', async () => {
        const genericError = new Error('Something unexpected happened');
        createTransaction.mockRejectedValue(genericError);

        await createTransactionRequest(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error"));
    });
});

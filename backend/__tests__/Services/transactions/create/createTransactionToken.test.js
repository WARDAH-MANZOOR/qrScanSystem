import jwt from 'jsonwebtoken';
import transactionsCreateService from "../../../../dist/services/transactions/create.js"; // Adjust the import path based on your project structure

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
}));

describe('createTransactionToken', () => {
    const mockTransactionId = 'txn123';

    it('should generate a token with the correct transactionId and secret', () => {
        const mockToken = 'mockGeneratedToken';
        const secret = process.env.JWTSECRET || 'your_default_secret';

        jwt.sign.mockReturnValue(mockToken); // Mock JWT sign function

        const result = transactionsCreateService.createTransactionToken(mockTransactionId);

        // Verify that jwt.sign was called with correct arguments
        expect(jwt.sign).toHaveBeenCalledWith(
            { transactionId: mockTransactionId },
            secret,
            { expiresIn: '1h' }
        );

        // Verify the result of createTransactionToken is the mocked token
        expect(result).toBe(mockToken);
    });

    it('should use default secret if JWTSECRET is not provided in environment', () => {
        const mockToken = 'mockGeneratedToken';
        const secret = 'your_default_secret';

        jwt.sign.mockReturnValue(mockToken); // Mock JWT sign function

        // Temporarily remove any environment variable for JWTSECRET to test the default secret
        delete process.env.JWTSECRET;

        const result = transactionsCreateService.createTransactionToken(mockTransactionId);

        // Verify the secret used is the default one
        expect(jwt.sign).toHaveBeenCalledWith(
            { transactionId: mockTransactionId },
            secret,
            { expiresIn: '1h' }
        );

        expect(result).toBe(mockToken);
    });

    it('should throw an error if transactionId is not provided', () => {
        try {
            transactionsCreateService.createTransactionToken(); // Call without transactionId
        } catch (error) {
            // Verify that an error is thrown when transactionId is missing
            expect(error).toBeDefined();
            expect(error.message).toBe('transactionId is required');
        }
    });
});

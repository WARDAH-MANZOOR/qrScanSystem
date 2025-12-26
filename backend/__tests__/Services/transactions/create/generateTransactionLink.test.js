import transactionsCreateService from "../../../../dist/services/transactions/create.js"; // Adjust the import path based on your project structure
import jwt from 'jsonwebtoken';

// Define the createTransactionToken function inside the test file
function createTransactionToken(transactionId) {
    const secret = process.env.JWTSECRET || 'your_default_secret';
    const token = jwt.sign({ transactionId }, secret, { expiresIn: '1h' });
    return token;
}
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });

describe('generateTransactionLink', () => {
    const mockTransactionId = 'txn123';
    const mockToken = createTransactionToken(mockTransactionId); // Use your function to generate the mock token
    const baseUrl = 'http://localhost:3005/payment';

    it('should generate a correct transaction link with token and transactionId', async () => {
        const expectedLink = `${baseUrl}?t=${encodeURIComponent(mockToken)}&signupUrlResourceParams=${encodeURIComponent(mockTransactionId)}`;
        
        // Call the function with the mock transactionId
        const result = await transactionsCreateService.generateTransactionLink(mockTransactionId);

        // Verify that the result matches the expected link
        expect(result).toBe(expectedLink);
    });

    it('should throw an error if transactionId is not provided', async () => {
        try {
            await transactionsCreateService.generateTransactionLink(); // Call without transactionId
        } catch (error) {
            // Verify that an error is thrown when transactionId is missing
            expect(error).toBeDefined();
            expect(error.message).toBe('transactionId is required');
        }
    });
});

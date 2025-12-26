import { findTransaction } from '../../../../dist/services/paymentGateway/jazzCash.js'; // Adjust the import path
import prisma from '../../../../dist/prisma/client.js'; // Adjust the import path for prisma client

jest.mock('../../../../dist/prisma/client.js', () => ({
  __esModule: true, // If using ESModules
  default: {
    transaction: {
      findUnique: jest.fn(), // Mock the findUnique method
    },
  },
}));

describe('findTransaction', () => {
  it('should return true if the transaction with pending status exists', async () => {
    // Mock a transaction with the "pending" status
    const mockTransaction = {
      transaction_id: 12345,
      status: 'pending',
    };

    // Mock the prisma method to return the mockTransaction
    prisma.transaction.findUnique.mockResolvedValue(mockTransaction);

    // Call the function and check the result
    const result = await findTransaction(12345);
    expect(result).toBe(true); // Expect true because the transaction exists with "pending" status
  });

  it('should return false if no transaction with pending status is found', async () => {
    // Mock no transaction found (null)
    prisma.transaction.findUnique.mockResolvedValue(null);

    // Call the function and check the result
    const result = await findTransaction(12345);
    expect(result).toBe(false); // Expect false because no transaction with "pending" status is found
  });
});

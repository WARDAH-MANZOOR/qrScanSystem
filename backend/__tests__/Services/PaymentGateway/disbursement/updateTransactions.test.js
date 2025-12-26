import { updateTransactions } from '../../../../dist/services/paymentGateway/disbursement.js';
import prisma from '../../../../dist/prisma/client.js';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma client with proper structure
jest.mock('../../../../dist/prisma/client.js', () => ({
  transaction: {
    update: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
}));

describe('updateTransactions', () => {
  it('should update multiple transactions with correct balance', async () => {
    // Mock the update method of Prisma client
    prisma.transaction.update.mockResolvedValueOnce({ transaction_id: 1, balance: new Decimal(0) });
    prisma.transaction.update.mockResolvedValueOnce({ transaction_id: 2, balance: new Decimal(50) });

    const updates = [
      {
        transaction_id: 1,
        disbursed: true,
        balance: new Decimal(0),
      },
      {
        transaction_id: 2,
        disbursed: false,
        balance: new Decimal(50),
      },
    ];

    // Call the function with mock data
    await updateTransactions(updates, prisma);

    // Check that updateTransactions calls Prisma's update method with correct arguments
    expect(prisma.transaction.update).toHaveBeenCalledWith({
      where: { transaction_id: 1 },
      data: { balance: new Decimal(0) },
    });
    expect(prisma.transaction.update).toHaveBeenCalledWith({
      where: { transaction_id: 2 },
      data: { balance: new Decimal(50) },
    });
    expect(prisma.transaction.update).toHaveBeenCalledTimes(2); // Expect two update calls
  });


  it('should throw an error if update fails', async () => {
    // Mock an error from Prisma update method
    prisma.transaction.update.mockRejectedValueOnce(new Error('Update failed'));

    const updates = [
      {
        transaction_id: 1,
        disbursed: true,
        balance: new Decimal(0),
      },
    ];

    // Expect the function to throw an error
    await expect(updateTransactions(updates, prisma)).rejects.toThrow('Update failed');
  });
});

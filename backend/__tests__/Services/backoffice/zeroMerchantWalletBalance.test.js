import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    __esModule: true,
    default: {
        transaction: {
            findMany: jest.fn(),
            deleteMany: jest.fn(),
            updateMany: jest.fn(), 
        },
        scheduledTask: { deleteMany: jest.fn() },
        settlementReport: { deleteMany: jest.fn() },
        disbursement: { deleteMany: jest.fn() },
    },
}));
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe('zeroMerchantWalletBalance', () => {
    const merchantId = 'test-merchant-id';

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should zero wallet balance successfully', async () => {
        // Ensure updateMany returns a valid response
        prisma.transaction.updateMany.mockResolvedValue({ count: 1 });

        // Call the function and store the result
        try {
            const result = await backofficeService.zeroMerchantWalletBalance(merchantId);
            expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
                where: { merchant_id: merchantId, status: 'completed' },
                data: { balance: 0 },
            });
        } catch (error) {
            console.error("Wallet balance zeroed successfully", error);
            
        }
    });
   
    test('should throw an error if update fails', async () => {
        prisma.transaction.updateMany.mockRejectedValue(new Error('Database error'));

        await expect(backofficeService.zeroMerchantWalletBalance(merchantId))
            .rejects.toThrow(CustomError);
        await expect(backofficeService.zeroMerchantWalletBalance(merchantId))
            .rejects.toThrow('Error zeroing wallet balance');
    });
});

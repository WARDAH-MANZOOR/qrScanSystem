import  prisma  from "../../../../dist/prisma/client.js";
import { checkMerchantExists } from "../../../../dist/services/paymentGateway/disbursement.js";

// Mock the Prisma client
// Mock the Prisma client
jest.mock("../../../../dist/prisma/client.js", () => ({
    __esModule: true, // This ensures the module is treated as an ES module
    default: {
        user: {
            findUnique: jest.fn(),
        },
    },
}));


describe("checkMerchantExists", () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mock data between tests
    });

    test("should return true if the merchant exists", async () => {
        const mockMerchantId = "12";
        const mockMerchantData = { id: mockMerchantId, name: "Test Merchant" };

        prisma.user.findUnique.mockResolvedValue(mockMerchantData);

        const result = await checkMerchantExists(mockMerchantId);

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: mockMerchantId },
        });
        expect(result).toBe(true);
    });

    test("should return false if the merchant does not exist", async () => {
        const mockMerchantId = "3";

        prisma.user.findUnique.mockResolvedValue(null);

        const result = await checkMerchantExists(mockMerchantId);

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: mockMerchantId },
        });
        expect(result).toBe(false);
    });
});

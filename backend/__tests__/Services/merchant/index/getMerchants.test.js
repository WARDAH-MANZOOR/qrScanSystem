import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import merchantService from "../../../../dist/services/merchant/index.js";

jest.mock("../../../../dist/prisma/client.js", () => ({
    merchant: {
        findMany: jest.fn(),
    },
}));

jest.mock("../../../../dist/utils/custom_error.js", () => {
    return jest.fn().mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        error.name = 'CustomError';
        return error;
    });
});



describe("getMerchants", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Test Case 1: Successful retrieval of merchants without any filters
    it("should return a list of merchants without filters", async () => {
        const mockMerchants = [
            { id: 1, username: "Merchant A", commissions: [] },
            { id: 2, username: "Merchant B", commissions: [] },
        ];
        
        prisma.merchant.findMany.mockResolvedValue(mockMerchants);

        const result = await merchantService.getMerchants({});
        
        expect(result).toEqual(mockMerchants);
        expect(prisma.merchant.findMany).toHaveBeenCalledWith({
            where: {},
            include: {
                commissions: true,
            },
        });
    });

    // Test Case 2: Successful retrieval of merchants with `uid` filter
    it("should return a list of merchants filtered by uid", async () => {
        const mockMerchants = [
            { id: 1, username: "Merchant A", commissions: [] },
        ];

        const params = { uid: "12345" };

        prisma.merchant.findMany.mockResolvedValue(mockMerchants);

        const result = await merchantService.getMerchants(params);

        expect(result).toEqual(mockMerchants);
        expect(prisma.merchant.findMany).toHaveBeenCalledWith({
            where: { uid: "12345" },
            include: {
                commissions: true,
            },
        });
    });
    // Test Case 3: Return empty array if no merchants found
    it("should return an empty array if no merchants are found", async () => {
        prisma.merchant.findMany.mockResolvedValue([]);

        const result = await merchantService.getMerchants({});

        expect(result).toEqual([]);
        expect(prisma.merchant.findMany).toHaveBeenCalledWith({
            where: {},
            include: {
                commissions: true,
            },
        });
    });
    
});

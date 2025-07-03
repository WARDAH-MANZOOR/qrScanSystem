import disbursementRequestService from '../../../dist/services/disbursementRequest/index.js'; // Update this path to where your function is located
import prisma from "../../../dist/prisma/client.js";
import { backofficeService } from "../../../dist/services/index.js";
import { getWalletBalance } from "../../../dist/services/paymentGateway/disbursement.js";
import CustomError from "../../../dist/utils/custom_error.js";
import { parse, parseISO } from "date-fns";

// Mock the external dependencies
jest.mock("../../../dist/prisma/client.js", () => ({
    disbursementRequest: {
        findMany: jest.fn(),
        count: jest.fn()
    }
}));

jest.mock("../../../dist/utils/custom_error.js");
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("getDisbursementRequests", () => {
    const merchantId = 123;
    const mockTransactions = [
        { id: 1, status: "approved", createdAt: new Date("2023-01-01T10:00:00Z"), merchantId },
        { id: 2, status: "rejected", createdAt: new Date("2023-02-01T10:00:00Z"), merchantId }
    ];
    const mockMeta = { total: 2, pages: 1, page: 1, limit: 2 };

    beforeEach(() => {
        // Reset mocks before each test
        prisma.disbursementRequest.findMany.mockReset();
        prisma.disbursementRequest.count.mockReset();
    });

    it("should return transactions with meta data when valid parameters are provided", async () => {
        // Arrange: Mock the database calls
        prisma.disbursementRequest.findMany.mockResolvedValueOnce(mockTransactions);
        prisma.disbursementRequest.count.mockResolvedValueOnce(mockMeta.total);
    
        const params = {
            start: "2023-01-01T00:00:00Z",
            end: "2023-12-31T23:59:59Z",
            status: "approved",
            page: 1,
            limit: 2
        };
    
        // Act: Call the function
        const result = await disbursementRequestService.getDisbursementRequests(params, merchantId);
    
        // Assert: Ensure findMany is called with the correct parameters
        expect(prisma.disbursementRequest.findMany).toHaveBeenCalledWith({
            take: 2,
            where: {
                merchantId: 123,
                createdAt: {
                    gte: parse("2023-01-01T00:00:00Z", "yyyy-MM-dd'T'HH:mm:ssXXX", new Date()),
                    lt: parse("2023-12-31T23:59:59Z", "yyyy-MM-dd'T'HH:mm:ssXXX", new Date())
                },
                status: "approved"
            },
            orderBy: { createdAt: "desc" }
        });
    
        // Assert: Ensure count is called with the correct parameters
        expect(prisma.disbursementRequest.count).toHaveBeenCalledWith({
            where: {
                merchantId: 123,
                createdAt: {
                    gte: parse("2023-01-01T00:00:00Z", "yyyy-MM-dd'T'HH:mm:ssXXX", new Date()),
                    lt: parse("2023-12-31T23:59:59Z", "yyyy-MM-dd'T'HH:mm:ssXXX", new Date())
                },
                status: "approved"
            }
        });
    
        // Assert: Ensure the result matches the expected structure
        expect(result).toEqual({
            transactions: mockTransactions.map((transaction) => ({
                ...transaction,
            })),
            meta: mockMeta
        });
    });
    
    

    it("should return transactions with meta data without pagination when no page or limit is provided", async () => {
        // Arrange: Mock the database calls
        prisma.disbursementRequest.findMany.mockResolvedValueOnce(mockTransactions);
        prisma.disbursementRequest.count.mockResolvedValueOnce(mockMeta.total);

        const params = {
            start: "2023-01-01T00:00:00Z",
            end: "2023-12-31T23:59:59Z",
            status: "approved"
        };

        // Act: Call the function
        const result = await disbursementRequestService.getDisbursementRequests(params, merchantId);

        // Assert: Ensure findMany is called without pagination parameters
        expect(prisma.disbursementRequest.findMany).toHaveBeenCalledWith({
            where: {
                merchantId: 123,
                createdAt: {
                    gte: parse("2023-01-01T00:00:00Z", "yyyy-MM-dd'T'HH:mm:ssXXX", new Date()),
                    lt: parse("2023-12-31T23:59:59Z", "yyyy-MM-dd'T'HH:mm:ssXXX", new Date())
                },
                status: "approved"
            },
            orderBy: { createdAt: "desc" }
        });

        // Assert: Ensure the result matches the expected structure
        expect(result).toEqual({
            transactions: mockTransactions.map((transaction) => ({
                ...transaction,
            })),
            meta: {}  // No pagination
        });
    });
    test("should return error for missing params", async () => {
        const result = await disbursementRequestService.getDisbursementRequests(null, "123");
        const expectedError = new CustomError("Internal Server Error", 500);
    
        // Compare the properties of the error
        expect(result.message).toBe(expectedError.message);
        expect(result.statusCode).toBe(expectedError.statusCode);
    });
    
    test("should return error for missing merchantId", async () => {
        const result = await disbursementRequestService.getDisbursementRequests(
            { start: "2025-02-01", end: "2025-02-02", status: "approved" }, 
            null
        );
        const expectedError = new CustomError("Internal Server Error", 500);
    
        // Compare the properties of the error
        expect(result.message).toBe(expectedError.message);
        expect(result.statusCode).toBe(expectedError.statusCode);
    });
    
    test("should return error for invalid date format", async () => {
        const result = await disbursementRequestService.getDisbursementRequests(
            { start: "invalid-date", end: "2025-02-02", status: "approved" },
            "123"
        );
        const expectedError = new CustomError("Internal Server Error", 500);
    
        // Compare the properties of the error
        expect(result.message).toBe(expectedError.message);
        expect(result.statusCode).toBe(expectedError.statusCode);
    });
    
    test("should return error for invalid page value", async () => {
        const result = await disbursementRequestService.getDisbursementRequests({ start: "2025-02-01", end: "2025-02-02", status: "approved", page: "invalid", limit: "10" }, "123");
        const expectedError = new CustomError("Internal Server Error", 500);
        
        // Assert the error message and status code
        expect(result.message).toBe(expectedError.message);
        expect(result.statusCode).toBe(expectedError.statusCode);
    });
    
    
    test("should return error for invalid limit value", async () => {
        const result = await disbursementRequestService.getDisbursementRequests({ start: "2025-02-01", end: "2025-02-02", status: "approved", page: "1", limit: "invalid" }, "123");
        const expectedError = new CustomError("Internal Server Error", 500);
        
        // Assert the error message and status code
        expect(result.message).toBe(expectedError.message);
        expect(result.statusCode).toBe(expectedError.statusCode);
    });
    
    
    test("should handle custom error correctly", async () => {
        try {
            await disbursementRequestService.getDisbursementRequests({}, "123");
        } catch (error) {
            expect(error.message).toBe("Internal Server Error");
            expect(error.statusCode).toBe(500);
        }
    });
    
    
    
});
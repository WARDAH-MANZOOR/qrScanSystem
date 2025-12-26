import { apiKeyAuth } from "../../dist/middleware/auth.js";
import prisma from "../../dist/prisma/client.js";
import { verifyHashedKey } from "../../dist/utils/authentication.js";
import { mockRequest, mockResponse } from 'jest-mock-req-res';  // Helper to mock req/res

jest.mock('../../dist/prisma/client.js', () => ({
    merchant: {
        findFirst: jest.fn(),
    },
    user: {
        findFirst: jest.fn(),
    },
}));

jest.mock('../../dist/utils/authentication.js');

describe('apiKeyAuth Middleware', () => {
    let mockReq;
    let mockRes;
    let next;

    beforeEach(() => {
        mockReq = mockRequest();
        mockRes = mockResponse();
        next = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error

    });

    it('should return 400 if merchantId is missing from request params', async () => {
        mockReq.headers = { "x-api-key": "validApiKey" };

        await apiKeyAuth(mockReq, mockRes, next);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "Merchant ID is required" });
    });

    it("should return 401 if API key is missing", async () => {
        mockReq.params = { merchantId: "someMerchantId" };
        mockReq.headers = {};

        await apiKeyAuth(mockReq, mockRes, next);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "API key is missing" });
    });


    it('should return 403 if merchant does not exist', async () => {
        mockReq.params = { merchantId: "123" };
        mockReq.headers = { "x-api-key": "validApiKey" };

        prisma.merchant.findFirst.mockResolvedValue(null);  // No merchant found

        await apiKeyAuth(mockReq, mockRes, next);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized: Invalid API key" });
    });

    it('should return 403 if user does not exist', async () => {
        mockReq.params = { merchantId: "123" };
        mockReq.headers = { "x-api-key": "validApiKey" };

        prisma.merchant.findFirst.mockResolvedValue({ user_id: "456" });
        prisma.user.findFirst.mockResolvedValue(null);  // No user found

        await apiKeyAuth(mockReq, mockRes, next);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized: Invalid API key" });
    });

    it('should return 403 if user has no API key', async () => {
        mockReq.params = { merchantId: "123" };
        mockReq.headers = { "x-api-key": "validApiKey" };

        prisma.merchant.findFirst.mockResolvedValue({ user_id: "456" });
        prisma.user.findFirst.mockResolvedValue({ apiKey: null });  // No API key for user

        await apiKeyAuth(mockReq, mockRes, next);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized: Invalid API key" });
    });

    it('should return 403 if the API key is invalid', async () => {
        mockReq.params = { merchantId: "123" };
        mockReq.headers = { "x-api-key": "invalidApiKey" };

        prisma.merchant.findFirst.mockResolvedValue({ user_id: "456" });
        prisma.user.findFirst.mockResolvedValue({ apiKey: "hashedApiKey" });

        verifyHashedKey.mockReturnValue(false);  // Mock invalid API key

        await apiKeyAuth(mockReq, mockRes, next);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized: Invalid API key" });
    });

    it('should call next() if all checks pass', async () => {
        mockReq.params = { merchantId: "123" };
        mockReq.headers = { "x-api-key": "validApiKey" };

        prisma.merchant.findFirst.mockResolvedValue({ user_id: "456" });
        prisma.user.findFirst.mockResolvedValue({ apiKey: "hashedApiKey" });

        verifyHashedKey.mockReturnValue(true);  // Mock valid API key

        await apiKeyAuth(mockReq, mockRes, next);

        expect(next).toHaveBeenCalled();
    });

    it('should handle internal server error correctly', async () => {
        mockReq.params = { merchantId: "123" };
        mockReq.headers = { "x-api-key": "validApiKey" };

        prisma.merchant.findFirst.mockRejectedValue(new Error("DB Error"));  // Simulate DB error

        await apiKeyAuth(mockReq, mockRes, next);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "Internal server error" });
    });
});

import { zindigiService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import zindigiController from "../../../../dist/controller/paymentGateway/zindigi.js";

jest.mock("../../../../dist/services/index.js");  // Mocking the zindigiService
jest.mock("../../../../dist/utils/ApiResponse.js");  // Mocking the ApiResponse

describe("updateZindigiMerchant", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                merchantId: "12345",  // Simulate the merchantId in the request parameters
            },
            body: {
                name: "Updated Merchant",
                email: "updatedmerchant@example.com",
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks(); // Reset all mocks before each test
    });

    // Test Case 1: Successfully update the merchant
    it("should successfully update the merchant", async () => {
        const mockUpdatedMerchant = { id: "12345", name: "Updated Merchant", email: "updatedmerchant@example.com" };

        // Mocking the service to return the updated merchant
        zindigiService.updateMerchant.mockResolvedValueOnce(mockUpdatedMerchant);

        await zindigiController.updateZindigiMerchant(req, res, next);

        // Ensure updateMerchant is called with the correct merchantId and request body
        expect(zindigiService.updateMerchant).toHaveBeenCalledWith(req.params.merchantId, req.body);

        // Ensure the response is successful with status 200
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockUpdatedMerchant));
    });

    // Test Case 2: Return 404 if the merchant is not found
    it("should return 404 if the merchant is not found", async () => {
        // Mocking the service to return null, simulating that the merchant was not found
        zindigiService.updateMerchant.mockResolvedValueOnce(null);

        await zindigiController.updateZindigiMerchant(req, res, next);

        // Ensure the response is 404 with an appropriate error message
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant not found"));
    });

    // Test Case 3: Call next with an error if an exception is thrown
    it("should call next with an error if an unexpected error occurs", async () => {
        const mockError = new Error("Unexpected error");

        // Mocking updateMerchant to throw an error
        zindigiService.updateMerchant.mockRejectedValueOnce(mockError);

        await zindigiController.updateZindigiMerchant(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

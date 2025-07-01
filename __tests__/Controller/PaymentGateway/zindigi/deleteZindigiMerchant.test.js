import { zindigiService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import zindigiController from "../../../../dist/controller/paymentGateway/zindigi.js";

jest.mock("../../../../dist/services/index.js");  // Mocking the zindigiService
jest.mock("../../../../dist/utils/ApiResponse.js");  // Mocking the ApiResponse

describe("deleteZindigiMerchant", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                merchantId: "12345",  // Simulate the merchantId in the request parameters
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks(); // Reset all mocks before each test
    });

    // Test Case 1: Successfully delete the merchant
    it("should successfully delete the merchant", async () => {
        // Mocking the service to return a successful deletion response
        zindigiService.deleteMerchant.mockResolvedValueOnce(true);

        await zindigiController.deleteZindigiMerchant(req, res, next);

        // Ensure deleteMerchant is called with the correct merchantId
        expect(zindigiService.deleteMerchant).toHaveBeenCalledWith(req.params.merchantId);

        // Ensure the response is successful with status 200
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success({ message: "Merchant deleted successfully" }));
    });

    // Test Case 2: Return 404 if the merchant is not found
    it("should return 404 if the merchant is not found", async () => {
        // Mocking the service to return null, simulating that the merchant was not found
        zindigiService.deleteMerchant.mockResolvedValueOnce(null);

        await zindigiController.deleteZindigiMerchant(req, res, next);

        // Ensure the response is 404 with an appropriate error message
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant not found"));
    });

    // Test Case 3: Call next with an error if an exception is thrown
    it("should call next with an error if an unexpected error occurs", async () => {
        const mockError = new Error("Unexpected error");

        // Mocking deleteMerchant to throw an error
        zindigiService.deleteMerchant.mockRejectedValueOnce(mockError);

        await zindigiController.deleteZindigiMerchant(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

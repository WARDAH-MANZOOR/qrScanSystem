import { zindigiService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import zindigiController from "../../../../dist/controller/paymentGateway/zindigi.js";

jest.mock("../../../../dist/services/index.js");  // Mocking the zindigiService
jest.mock("../../../../dist/utils/ApiResponse.js");  // Mocking the ApiResponse

describe("getZindigiMerchant", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                merchantId: "12345"  // Simulate a merchantId in the request parameters
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks(); // Reset all mocks before each test
    });

    // Test Case 1: should fetch merchant details successfully
    it("should fetch merchant details successfully", async () => {
        const mockMerchant = { id: "12345", name: "Test Merchant", status: "active" };

        // Mocking the service to return a valid merchant
        zindigiService.getMerchant.mockResolvedValueOnce(mockMerchant);

        await zindigiController.getZindigiMerchant(req, res, next);

        // Ensure the service is called with the correct merchantId
        expect(zindigiService.getMerchant).toHaveBeenCalledWith("12345");

        // Ensure the response is successful
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockMerchant));
    });

    // Test Case 2: should call next with an error if getting merchant fails
    it("should call next with an error if getting merchant fails", async () => {
        const mockError = new Error("Merchant not found");

        // Mocking the service to throw an error
        zindigiService.getMerchant.mockRejectedValueOnce(mockError);

        await zindigiController.getZindigiMerchant(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

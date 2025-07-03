import { zindigiService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import zindigiController from "../../../../dist/controller/paymentGateway/zindigi.js";

jest.mock("../../../../dist/services/index.js");  // Mocking the zindigiService
jest.mock("../../../../dist/utils/ApiResponse.js");  // Mocking the ApiResponse

describe("createZindigiMerchant", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                name: "New Merchant",  // Simulate merchant data in the request body
                email: "merchant@example.com",
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks(); // Reset all mocks before each test
    });

    // Test Case 1: should successfully create a new merchant
    it("should successfully create a new merchant", async () => {
        const mockMerchantResponse = { id: "12345", name: "New Merchant", email: "merchant@example.com" };

        // Mocking the service to return the newly created merchant
        zindigiService.createMerchant.mockResolvedValueOnce(mockMerchantResponse);

        await zindigiController.createZindigiMerchant(req, res, next);

        // Ensure createMerchant is called with the correct request body
        expect(zindigiService.createMerchant).toHaveBeenCalledWith(req.body);

        // Ensure the response is successful with status 201
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockMerchantResponse));
    });

    // Test Case 2: should call next with an error if merchant creation fails
    it("should call next with an error if merchant creation fails", async () => {
        const mockError = new Error("Error creating merchant");

        // Mocking createMerchant to throw an error
        zindigiService.createMerchant.mockRejectedValueOnce(mockError);

        await zindigiController.createZindigiMerchant(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

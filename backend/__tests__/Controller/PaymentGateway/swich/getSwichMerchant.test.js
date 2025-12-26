import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { swichService } from "../../../../dist/services/index.js";
import SwichController from "../../../../dist/controller/paymentGateway/swich.js";

// Mocking external services
jest.mock('../../../../dist/services/index.js');
jest.mock('../../../../dist/utils/ApiResponse.js');

describe("getSwichMerchant", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                merchantId: "testMerchantId", // Mocking the merchantId parameter
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks(); // Reset all mocks before each test
    });

    it("should successfully return merchant data", async () => {
        const mockMerchant = { id: "testMerchantId", name: "Test Merchant" };

        // Mock the service response
        swichService.getMerchant.mockResolvedValueOnce(mockMerchant);

        await SwichController.getSwichMerchant(req, res, next);

        // Ensure the service was called with the correct parameters
        expect(swichService.getMerchant).toHaveBeenCalledWith(req.params.merchantId);

        // Ensure the response is successful
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockMerchant));
    });

    it("should call next with an error if there is an unexpected error", async () => {
        const mockError = new Error("Unexpected error");

        // Mock the service to throw an error
        swichService.getMerchant.mockRejectedValueOnce(mockError);

        await SwichController.getSwichMerchant(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

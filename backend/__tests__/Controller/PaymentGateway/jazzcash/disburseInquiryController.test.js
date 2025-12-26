import JazzCashController from "../../../../dist/controller/paymentGateway/jazzCash.js";
import { getToken, checkTransactionStatus } from "../../../../dist/services/paymentGateway/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";

// Mock necessary functions
jest.mock("../../../../dist/services/paymentGateway/index.js", () => ({
    getToken: jest.fn(),
    checkTransactionStatus: jest.fn(),

}));

jest.mock("../../../../dist/utils/apiResponse.js", () => ({
    success: jest.fn(),
}));

describe("disburseInquiryController", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                merchantId: "testMerchantId",
            },
            body: {
                transactionId: "testTransactionId",
            },
        };

        res = {
            status: jest.fn().mockReturnThis(), // Chainable status method
            json: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks(); // Reset all mocks before each test
    });

    it("should return a successful response with transaction inquiry", async () => {
        const mockToken = { access_token: "testAccessToken" };
        const mockInquiry = { status: "success", data: "inquiryData" };

        // Mock getToken and checkTransactionStatus responses
        getToken.mockResolvedValueOnce(mockToken);
        checkTransactionStatus.mockResolvedValueOnce(mockInquiry);
        ApiResponse.success.mockReturnValueOnce(mockInquiry);

        // Call the disburseInquiryController function
        await JazzCashController.disburseInquiryController(req, res, next);

        // Assertions
        expect(getToken).toHaveBeenCalledWith(req.params.merchantId); // Ensure getToken is called with merchantId
        expect(checkTransactionStatus).toHaveBeenCalledWith(mockToken.access_token, req.body, req.params.merchantId); // Ensure checkTransactionStatus is called with correct params
        expect(res.status).toHaveBeenCalledWith(200); // Check if status code 200 is returned
        expect(res.json).toHaveBeenCalledWith(mockInquiry); // Check if response is sent with inquiry data
    });

    it("should call next with an error if getToken fails", async () => {
        const mockError = new Error("Token retrieval failed");

        // Mock getToken to throw an error
        getToken.mockRejectedValueOnce(mockError);

        // Call the disburseInquiryController function
        await JazzCashController.disburseInquiryController(req, res, next);

        // Assertions
        expect(getToken).toHaveBeenCalledWith(req.params.merchantId); // Ensure getToken is called with merchantId
        expect(next).toHaveBeenCalledWith(mockError); // Ensure next is called with the error
    });

    it("should call next with an error if checkTransactionStatus fails", async () => {
        const mockToken = { access_token: "testAccessToken" };
        const mockError = new Error("Transaction status check failed");

        // Mock getToken and checkTransactionStatus responses
        getToken.mockResolvedValueOnce(mockToken);
        checkTransactionStatus.mockRejectedValueOnce(mockError);

        // Call the disburseInquiryController function
        await JazzCashController.disburseInquiryController(req, res, next);

        // Assertions
        expect(getToken).toHaveBeenCalledWith(req.params.merchantId); // Ensure getToken is called with merchantId
        expect(checkTransactionStatus).toHaveBeenCalledWith(mockToken.access_token, req.body, req.params.merchantId); // Ensure checkTransactionStatus is called with correct params
        expect(next).toHaveBeenCalledWith(mockError); // Ensure next is called with the error
    });
});

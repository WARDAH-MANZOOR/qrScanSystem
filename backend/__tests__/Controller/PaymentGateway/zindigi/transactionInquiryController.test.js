import { zindigiService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import zindigiController from "../../../../dist/controller/paymentGateway/zindigi.js";

jest.mock("../../../../dist/services/index.js");  // Mocking the zindigiService
jest.mock("../../../../dist/utils/ApiResponse.js");  // Mocking the ApiResponse

describe("transactionInquiryController", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                transactionId: "12345",  // Simulate a transaction ID in the request body
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks(); // Reset all mocks before each test
    });

    // Test Case 1: should successfully return transaction inquiry response
    it("should successfully return transaction inquiry response", async () => {
        const mockResponse = { transactionId: "12345", status: "success", amount: 100 };

        // Mocking the service to return a valid response
        zindigiService.transactionInquiry.mockResolvedValueOnce(mockResponse);

        await zindigiController.transactionInquiryController(req, res, next);

        // Ensure the service is called with the correct request body
        expect(zindigiService.transactionInquiry).toHaveBeenCalledWith(req.body);

        // Ensure the response is successful
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResponse));
    });

    // Test Case 2: should call next with an error if transaction inquiry fails
    it("should call next with an error if transaction inquiry fails", async () => {
        const mockError = new Error("Transaction inquiry failed");

        // Mocking the service to throw an error
        zindigiService.transactionInquiry.mockRejectedValueOnce(mockError);

        await zindigiController.transactionInquiryController(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

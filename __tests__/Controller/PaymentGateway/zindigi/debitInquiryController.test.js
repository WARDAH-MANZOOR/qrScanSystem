import { zindigiService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import zindigiController from "../../../../dist/controller/paymentGateway/zindigi.js";

jest.mock("../../../../dist/services/index.js");  // Mocking the zindigiService
jest.mock("../../../../dist/utils/ApiResponse.js");  // Mocking the ApiResponse

describe("debitInquiryController", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                accountId: "12345",  // Simulate accountId in the request body
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks(); // Reset all mocks before each test
    });

    // Test Case 1: should successfully perform debit inquiry and debit payment
    it("should successfully perform debit inquiry and debit payment", async () => {
        const mockInquiryResponse = { balance: 1000, status: "success" };
        const mockPaymentResponse = { transactionId: "67890", status: "success" };

        // Mocking the service to return valid responses for both debitInquiry and debitPayment
        zindigiService.debitInquiry.mockResolvedValueOnce(mockInquiryResponse);
        zindigiService.debitPayment.mockResolvedValueOnce(mockPaymentResponse);

        await zindigiController.debitInquiryController(req, res, next);

        // Ensure debitInquiry is called with the correct request body
        expect(zindigiService.debitInquiry).toHaveBeenCalledWith(req.body);

        // Ensure debitPayment is called with the correct request body and the response from debitInquiry
        expect(zindigiService.debitPayment).toHaveBeenCalledWith(req.body, mockInquiryResponse);

        // Ensure the response is successful
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockPaymentResponse));
    });

    // Test Case 2: should call next with an error if debitInquiry or debitPayment fails
    it("should call next with an error if debitInquiry or debitPayment fails", async () => {
        const mockError = new Error("Error during debit inquiry or payment");

        // Mocking debitInquiry to throw an error
        zindigiService.debitInquiry.mockRejectedValueOnce(mockError);

        await zindigiController.debitInquiryController(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

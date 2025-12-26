import { zindigiService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import zindigiController from "../../../../dist/controller/paymentGateway/zindigi.js";

jest.mock("../../../../dist/services/index.js");  // Mocking the zindigiService
jest.mock("../../../../dist/utils/ApiResponse.js");  // Mocking the ApiResponse

describe("walletToWalletPaymentController", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                amount: 100,
                sender: "sender_account",
                receiver: "receiver_account"
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks(); // Reset all mocks before each test
    });

    it("should process payment successfully with existing client secret", async () => {
        // Mocking the service calls to simulate a successful payment with the existing client secret
        zindigiService.fetchExistingClientSecret.mockResolvedValueOnce("existingClientSecret");
        zindigiService.walletToWalletPayment.mockResolvedValueOnce({ success: true, data: { transactionId: "12345" } });

        await zindigiController.walletToWalletPaymentController(req, res, next);

        // Ensure the service methods are called with the correct parameters
        expect(zindigiService.fetchExistingClientSecret).toHaveBeenCalledTimes(1);
        expect(zindigiService.walletToWalletPayment).toHaveBeenCalledWith(req.body, "existingClientSecret");

        // Ensure the response is successful
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success({ transactionId: "12345" }));
    });

    it("should attempt to use a new client secret if the existing one is invalid", async () => {
        // Mocking the service calls to simulate a failed payment with the existing client secret and a successful payment with the new client secret
        zindigiService.fetchExistingClientSecret.mockResolvedValueOnce("existingClientSecret");
        zindigiService.walletToWalletPayment.mockResolvedValueOnce({ success: false });

        zindigiService.generateNewClientSecret.mockResolvedValueOnce("newClientSecret");
        zindigiService.walletToWalletPayment.mockResolvedValueOnce({ success: true, data: { transactionId: "67890" } });

        await zindigiController.walletToWalletPaymentController(req, res, next);

        // Ensure the service methods are called with the correct parameters
        expect(zindigiService.fetchExistingClientSecret).toHaveBeenCalledTimes(1);
        expect(zindigiService.walletToWalletPayment).toHaveBeenCalledWith(req.body, "existingClientSecret");
        expect(zindigiService.generateNewClientSecret).toHaveBeenCalledTimes(1);
        expect(zindigiService.walletToWalletPayment).toHaveBeenCalledWith(req.body, "newClientSecret");

        // Ensure the response is successful
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success({ transactionId: "67890" }));
    });
    

    it("should call next with an error if an unexpected error occurs", async () => {
        const mockError = new Error("Unexpected error");

        // Mocking the service to throw an error
        zindigiService.fetchExistingClientSecret.mockRejectedValueOnce(mockError);

        await zindigiController.walletToWalletPaymentController(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

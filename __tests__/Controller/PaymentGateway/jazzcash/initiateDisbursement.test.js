import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { getToken, initiateTransaction } from "../../../../dist/services/paymentGateway/index.js";
import JazzCashController from "../../../../dist/controller/paymentGateway/jazzCash.js";

// Mock the external services and functions
jest.mock("../../../../dist/services/paymentGateway/index.js", () => ({
    getToken: jest.fn(),
    initiateTransaction: jest.fn(),
}));

jest.mock("../../../../dist/utils/ApiResponse.js", () => ({
    success: jest.fn((data) => ({ status: "success", data })),
    error: jest.fn((message) => ({ status: "error", message })),
}));

describe("initiateDisbursment", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                accountNumber: "123456789",
                amount: 1000,
            },
            params: {
                merchantId: "12345",
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
        jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error


    });

    it("should log a message and return a successful response for a valid request", async () => {
        const mockToken = { access_token: "mock_token" };
        const mockTransactionResponse = { transactionId: "abc123", status: "success" };

        getToken.mockResolvedValueOnce(mockToken);
        initiateTransaction.mockResolvedValueOnce(mockTransactionResponse);

        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        await JazzCashController.initiateDisbursment(req, res, next);

        expect(consoleSpy).toHaveBeenCalledWith("IBFT Called");
        expect(getToken).toHaveBeenCalledWith(req.params.merchantId);
        expect(initiateTransaction).toHaveBeenCalledWith(
            mockToken.access_token,
            req.body,
            req.params.merchantId
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockTransactionResponse));

        consoleSpy.mockRestore();
    });

    it("should call next with an error if getToken fails", async () => {
        const mockError = new Error("Token retrieval failed");

        getToken.mockRejectedValueOnce(mockError);

        await JazzCashController.initiateDisbursment(req, res, next);

        expect(getToken).toHaveBeenCalledWith(req.params.merchantId);
        expect(initiateTransaction).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(mockError);
    });

    it("should call next with an error if initiateTransaction fails", async () => {
        const mockToken = { access_token: "mock_token" };
        const mockError = new Error("Transaction initiation failed");

        getToken.mockResolvedValueOnce(mockToken);
        initiateTransaction.mockRejectedValueOnce(mockError);

        await JazzCashController.initiateDisbursment(req, res, next);

        expect(getToken).toHaveBeenCalledWith(req.params.merchantId);
        expect(initiateTransaction).toHaveBeenCalledWith(
            mockToken.access_token,
            req.body,
            req.params.merchantId
        );
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { getToken, mwTransaction } from "../../../../dist/services/paymentGateway/index.js";
import JazzCashController from "../../../../dist/controller/paymentGateway/jazzCash.js";

// Mock the external services and functions
jest.mock("../../../../dist/services/paymentGateway/index.js", () => ({
    getToken: jest.fn(),
    mwTransaction: jest.fn(),
}));

jest.mock("../../../../dist/utils/ApiResponse.js", () => ({
    success: jest.fn((data) => ({ status: "success", data })),
    error: jest.fn((message) => ({ status: "error", message })),
}));

describe("initiateMWDisbursement", () => {
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
    });

    it("should return a successful response for a valid request", async () => {
        const mockToken = { access_token: "mock_token" };
        const mockTransactionResponse = { transactionId: "xyz123", status: "success" };

        // Mock the services to return a successful response
        getToken.mockResolvedValueOnce(mockToken);
        mwTransaction.mockResolvedValueOnce(mockTransactionResponse);

        // Call the function
        await JazzCashController.initiateMWDisbursement(req, res, next);

        // Assertions
        expect(getToken).toHaveBeenCalledWith(req.params.merchantId); // Check if the token is fetched correctly
        expect(mwTransaction).toHaveBeenCalledWith(mockToken.access_token, req.body, req.params.merchantId); // Check if the transaction is initiated
        expect(res.status).toHaveBeenCalledWith(200); // Check if status code 200 is returned
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockTransactionResponse)); // Check if the response is correct
    });

    it("should call next with an error if getToken fails", async () => {
        const mockError = new Error("Token retrieval failed");

        // Mock the failure of getToken
        getToken.mockRejectedValueOnce(mockError);

        // Call the function
        await JazzCashController.initiateMWDisbursement(req, res, next);

        // Assertions
        expect(getToken).toHaveBeenCalledWith(req.params.merchantId);
        expect(mwTransaction).not.toHaveBeenCalled(); // mwTransaction shouldn't be called
        expect(next).toHaveBeenCalledWith(mockError); // next should be called with the error
    });

    it("should call next with an error if mwTransaction fails", async () => {
        const mockToken = { access_token: "mock_token" };
        const mockError = new Error("Transaction initiation failed");

        // Mock both services, one to succeed and the other to fail
        getToken.mockResolvedValueOnce(mockToken);
        mwTransaction.mockRejectedValueOnce(mockError);

        // Call the function
        await JazzCashController.initiateMWDisbursement(req, res, next);

        // Assertions
        expect(getToken).toHaveBeenCalledWith(req.params.merchantId);
        expect(mwTransaction).toHaveBeenCalledWith(mockToken.access_token, req.body, req.params.merchantId);
        expect(next).toHaveBeenCalledWith(mockError); // next should be called with the error
    });
});

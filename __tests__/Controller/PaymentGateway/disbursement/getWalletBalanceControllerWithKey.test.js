import { getWalletBalanceWithKey } from "../../../../dist/services/paymentGateway/disbursement.js";
import { getWalletBalanceControllerWithKey } from "../../../../dist/controller/paymentGateway/disbursement.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";

jest.mock("../../../../dist/services/paymentGateway/disbursement.js");

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn();
    return res;
};

const mockNext = jest.fn();

describe("getWalletBalanceControllerWithKey", () => {
    let req, res;

    beforeEach(() => {
        req = { params: { merchantId: "merchant123" } }; // Use `merchantId` from req.params
        res = mockResponse();
        jest.clearAllMocks();
    });

    it("should return wallet balance for a valid merchant ID", async () => {
        const walletBalanceMock = { walletBalance: 1000, todayBalance: 500 };
        getWalletBalanceWithKey.mockResolvedValue(walletBalanceMock);

        await getWalletBalanceControllerWithKey(req, res, mockNext);

        expect(getWalletBalanceWithKey).toHaveBeenCalledWith("merchant123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success({ ...walletBalanceMock }));
    });

    it("should return 401 if merchant ID is missing", async () => {
        req.params.merchantId = null; // Simulate missing merchantId

        await getWalletBalanceControllerWithKey(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("should handle errors and call next with the error", async () => {
        const error = new Error("Database error");
        getWalletBalanceWithKey.mockRejectedValue(error);

        await getWalletBalanceControllerWithKey(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(error);
    });
});

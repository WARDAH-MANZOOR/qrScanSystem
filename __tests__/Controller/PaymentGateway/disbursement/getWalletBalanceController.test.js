import { getWalletBalanceController } from "../../../../dist/controller/paymentGateway/disbursement.js";
import { getWalletBalance } from "../../../../dist/services/paymentGateway/disbursement.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";

jest.mock("../../../../dist/services/paymentGateway/disbursement.js");

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn();
    return res;
};

const mockNext = jest.fn();

describe("getWalletBalanceController", () => {
    let req, res;

    beforeEach(() => {
        req = { user: { merchant_id: "merchant123" } }; // Use `merchant_id` as per the function
        res = mockResponse();
        jest.clearAllMocks();
    });

    it("should return wallet balance for a valid merchant ID", async () => {
        const walletBalanceMock = { walletBalance: 1000, todayBalance: 500 };
        getWalletBalance.mockResolvedValue(walletBalanceMock);

        await getWalletBalanceController(req, res, mockNext);

        expect(getWalletBalance).toHaveBeenCalledWith("merchant123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(walletBalanceMock));
    });

    it("should return 401 if merchant ID is missing", async () => {
        req.user = null;

        await getWalletBalanceController(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("should handle errors and call next with the error", async () => {
        const error = new Error("Database error");
        getWalletBalance.mockRejectedValue(error);

        await getWalletBalanceController(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(error); // Ensure `next` is called with the error
    });
});

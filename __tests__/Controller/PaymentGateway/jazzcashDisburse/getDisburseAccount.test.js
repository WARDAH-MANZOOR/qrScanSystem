import jazzcashDisburse from "../../../../dist/services/paymentGateway/jazzcashDisburse.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import jazzCashDisburseController from '../../../../dist/controller/paymentGateway/jazzcashDisburse.js'; // Controller function

jest.mock("../../../../dist/services/paymentGateway/jazzcashDisburse.js", () => ({
    getDisburseAccount: jest.fn(),
}));

describe("getDisburseAccount Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return the disburse account details with a 200 status code", async () => {
        const mockResult = {
            accountId: "123",
            accountName: "Test Account",
            accountNumber: "1234567890",
            status: "Active",
        };

        jazzcashDisburse.getDisburseAccount.mockResolvedValue(mockResult);

        const req = {
            params: {
                accountId: "123",
            },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        await jazzCashDisburseController.getDisburseAccount(req, res, next);

        expect(jazzcashDisburse.getDisburseAccount).toHaveBeenCalledWith("123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
        expect(next).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully and call next with the error", async () => {
        const mockError = new Error("Something went wrong");

        jazzcashDisburse.getDisburseAccount.mockRejectedValue(mockError);

        const req = {
            params: {
                accountId: "123",
            },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        await jazzCashDisburseController.getDisburseAccount(req, res, next);

        expect(jazzcashDisburse.getDisburseAccount).toHaveBeenCalledWith("123");
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(mockError);
    });
});

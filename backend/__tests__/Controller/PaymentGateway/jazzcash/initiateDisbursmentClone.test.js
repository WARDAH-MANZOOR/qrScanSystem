import { getToken, initiateTransactionClone } from "../../../../dist/services/paymentGateway/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import jazzCashController from "../../../../dist/controller/paymentGateway/jazzCash.js";

jest.mock("../../../../dist/services/paymentGateway/index.js", () => ({
    getToken: jest.fn(),
    initiateTransactionClone: jest.fn(),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

const mockRequest = (params, body) => ({ params, body });
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("initiateDisbursmentClone", () => {
    let req, res, next;

    beforeEach(() => {
        res = mockResponse();
        next = jest.fn();
    });

    it("should throw an error if amount is less than or equal to 1", async () => {
        req = mockRequest({ merchantId: "merchant123" }, { amount: 1 });

        await jazzCashController.initiateDisbursmentClone(req, res, next);

        expect(next).toHaveBeenCalledWith(new CustomError("Amount should be greater than 0", 400));
    });

    it("should successfully initiate disbursement when valid data is provided", async () => {
        req = mockRequest({ merchantId: "merchant123" }, { amount: 1000 });

        const mockToken = { access_token: "fake_token" };
        getToken.mockResolvedValue(mockToken);

        const mockTransaction = { transactionId: "123456789", status: "success" };
        initiateTransactionClone.mockResolvedValue(mockTransaction);

        await jazzCashController.initiateDisbursmentClone(req, res, next);

        expect(getToken).toHaveBeenCalledWith("merchant123");
        expect(initiateTransactionClone).toHaveBeenCalledWith(mockToken.access_token, req.body, "merchant123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockTransaction));
    });

    it("should handle unexpected errors", async () => {
        req = mockRequest({ merchantId: "merchant123" }, { amount: 1000 });

        const error = new Error("Internal Server Error");
        getToken.mockRejectedValue(error);

        await jazzCashController.initiateDisbursmentClone(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});

import { easyPaisaService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import EasypaisaController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock("../../../../dist/services/index.js", () => ({
    easyPaisaService: {
        disburseThroughBankClone: jest.fn(),
    },
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

describe("disburseThroughBankClone", () => {
    let req, res, next;

    beforeEach(() => {
        res = mockResponse();
        next = jest.fn();
    });

    it("should throw an error if amount is less than or equal to 1", async () => {
        req = mockRequest({ merchantId: "merchant123" }, { amount: 1 });

        await EasypaisaController.disburseThroughBankClone(req, res, next);

        expect(next).toHaveBeenCalledWith(new CustomError("Amount should be greater than 0", 400));
    });

    it("should successfully disburse through bank when valid data is provided", async () => {
        req = mockRequest({ merchantId: "merchant123" }, { amount: 1000 });

        const mockResponseData = { transactionId: "123456789", status: "success" };
        easyPaisaService.disburseThroughBankClone.mockResolvedValue(mockResponseData);

        await EasypaisaController.disburseThroughBankClone(req, res, next);

        expect(easyPaisaService.disburseThroughBankClone).toHaveBeenCalledWith(req.body, "merchant123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResponseData));
    });

    it("should handle unexpected errors", async () => {
        req = mockRequest({ merchantId: "merchant123" }, { amount: 1000 });

        const error = new Error("Internal Server Error");
        easyPaisaService.disburseThroughBankClone.mockRejectedValue(error);

        await EasypaisaController.disburseThroughBankClone(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});

import { validationResult } from "express-validator";
import { easyPaisaService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import EasypaisaController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock("../../../../dist/services/index.js", () => ({
    easyPaisaService: {
        createDisbursementClone: jest.fn(),
    },
}));

jest.mock("express-validator", () => ({
    validationResult: jest.fn(),
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

describe("createDisbursementClone", () => {
    let req, res, next;

    beforeEach(() => {
        res = mockResponse();
        next = jest.fn();
    });

    it("should throw an error if amount is less than or equal to 1", async () => {
        req = mockRequest({ merchantId: "merchant123" }, { amount: 1 });

        await EasypaisaController.createDisbursementClone(req, res, next);

        expect(next).toHaveBeenCalledWith(new CustomError("Amount should be greater than 0", 400));
    });

    it("should successfully create disbursement when valid data is provided", async () => {
        req = mockRequest({ merchantId: "merchant123" }, { amount: 1000 });

        const mockResponseData = { transactionId: "123456789", status: "success" };
        easyPaisaService.createDisbursementClone.mockResolvedValue(mockResponseData);

        await EasypaisaController.createDisbursementClone(req, res, next);

        expect(easyPaisaService.createDisbursementClone).toHaveBeenCalledWith(req.body, "merchant123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResponseData));
    });

    it("should handle unexpected errors", async () => {
        req = mockRequest({ merchantId: "merchant123" }, { amount: 1000 });

        const error = new Error("Internal Server Error");
        easyPaisaService.createDisbursementClone.mockRejectedValue(error);

        await EasypaisaController.createDisbursementClone(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});

import { paymentRequestService } from "../../../dist/services/index.js";
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import CustomError from "../../../dist/utils/custom_error.js";
import paymentRequestController from "../../../dist/controller/paymentRequest/index.js";


jest.mock("../../../dist/services/index.js", () => ({
    paymentRequestService: {
        createPaymentRequestClone: jest.fn(),
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

describe("createPaymentRequestClone", () => {
    let req, res, next;

    beforeEach(() => {
        res = mockResponse();
        next = jest.fn();
    });

    it("should successfully create a payment request when valid data is provided", async () => {
        req = mockRequest({ merchantId: "merchant123" }, { amount: 500 });

        const mockResponseData = { requestId: "REQ123", status: "created" };
        paymentRequestService.createPaymentRequestClone.mockResolvedValue(mockResponseData);

        await paymentRequestController.createPaymentRequestClone(req, res, next);

        expect(paymentRequestService.createPaymentRequestClone).toHaveBeenCalledWith(req.body, "merchant123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResponseData));
    });

    it("should handle unexpected errors", async () => {
        req = mockRequest({ merchantId: "merchant123" }, { amount: 500 });

        const error = new Error("Internal Server Error");
        paymentRequestService.createPaymentRequestClone.mockRejectedValue(error);

        await paymentRequestController.createPaymentRequestClone(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});

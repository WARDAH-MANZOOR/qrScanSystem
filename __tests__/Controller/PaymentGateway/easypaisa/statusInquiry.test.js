import { validationResult } from "express-validator";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import swichService from "../../../../dist/services/paymentGateway/swich.js";
import transactionService from "../../../../dist/services/transactions/index.js";
import easyPaisaController from "../../../../dist/controller/paymentGateway/easyPaisa.js";


jest.mock("../../../../dist/services/paymentGateway/easypaisa.js");
jest.mock("../../../../dist/services/paymentGateway/swich.js");
jest.mock("../../../../dist/services/transactions/index.js");
jest.mock("express-validator", () => ({
  body: jest.fn().mockReturnValue({
    isEmail: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
  }),
  validationResult: jest.fn(),
}));

describe("statusInquiry", () => {
  const mockReq = (overrides = {}) => ({
    params: { merchantId: "12345" },
    query: { orderId: "67890" },
    ip: "127.0.0.1",
    ...overrides,
  });

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return validation error if validationResult is not empty", async () => {
    const req = mockReq();
    const res = mockRes();
    validationResult.mockReturnValueOnce({ isEmpty: jest.fn().mockReturnValue(false), array: jest.fn().mockReturnValue(["Validation error"]) });

    await easyPaisaController.statusInquiry(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Validation error"));
  });

  test("should return error if merchantId is missing", async () => {
    const req = mockReq({ params: { merchantId: undefined } });
    const res = mockRes();
    validationResult.mockReturnValueOnce({ isEmpty: jest.fn().mockReturnValue(true) });

    await easyPaisaController.statusInquiry(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
  });

  test("should call easypaisa inquiry for WALLET method and DIRECT channel", async () => {
    const req = mockReq();
    const res = mockRes();
    validationResult.mockReturnValueOnce({ isEmpty: jest.fn().mockReturnValue(true) });

    transactionService.getMerchantChannel.mockResolvedValueOnce({ easypaisaPaymentMethod: "DIRECT" });
    transactionService.getMerchantInquiryMethod.mockResolvedValueOnce({ easypaisaInquiryMethod: "WALLET" });
    easyPaisaService.easypaisainquiry.mockResolvedValueOnce({ statusCode: 200, data: "Success" });

    await easyPaisaController.statusInquiry(req, res, mockNext);

    expect(easyPaisaService.easypaisainquiry).toHaveBeenCalledWith(req.query, req.params.merchantId);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.success({ statusCode: 200, data: "Success" }));
  });

  test("should call swich inquiry for WALLET method and non-DIRECT channel", async () => {
    const req = mockReq();
    const res = mockRes();
    validationResult.mockReturnValueOnce({ isEmpty: jest.fn().mockReturnValue(true) });

    transactionService.getMerchantChannel.mockResolvedValueOnce({ easypaisaPaymentMethod: "INDIRECT" });
    transactionService.getMerchantInquiryMethod.mockResolvedValueOnce({ easypaisaInquiryMethod: "WALLET" });
    swichService.swichTxInquiry.mockResolvedValueOnce({ statusCode: 200, data: "Switch Success" });

    await easyPaisaController.statusInquiry(req, res, mockNext);

    expect(swichService.swichTxInquiry).toHaveBeenCalledWith(req.query.orderId, req.params.merchantId);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.success({ statusCode: 200, data: "Switch Success" }));
  });

  

  test("should call next with error on exception", async () => {
    const req = mockReq();
    const res = mockRes();
    const error = new Error("Unexpected Error");

    validationResult.mockReturnValueOnce({ isEmpty: jest.fn().mockReturnValue(true) });
    transactionService.getMerchantChannel.mockRejectedValueOnce(error);

    await easyPaisaController.statusInquiry(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});

import { validationResult } from "express-validator";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import jazzCashService from "../../../../dist/services/paymentGateway/jazzCash.js";
import jazzCashController from "../../../../dist/controller/paymentGateway/jazzCash.js";

jest.mock("../../../../dist/services/paymentGateway/jazzCash.js");

jest.mock("express-validator", () => ({
  body: jest.fn().mockReturnValue({
    isEmail: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
  }),
  validationResult: jest.fn().mockReturnValue({
    isEmpty: jest.fn().mockReturnValue(true),
    array: jest.fn().mockReturnValue([]),
  }),
}));

describe("statusInquiry Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return error if merchantId is missing", async () => {
    const req = { params: {}, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await jazzCashController.statusInquiry(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
    expect(next).not.toHaveBeenCalled();
  });

  it("should handle successful status inquiry", async () => {
    const req = { params: { merchantId: "123" }, body: { orderId: "456" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    const mockResult = { status: "success", statusCode: 200 };

    jazzCashService.statusInquiry.mockResolvedValue(mockResult);

    await jazzCashController.statusInquiry(req, res, next);

    expect(jazzCashService.statusInquiry).toHaveBeenCalledWith(req.body, "123");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult, "", 200));
    expect(next).not.toHaveBeenCalled();
  });

  it("should handle error during status inquiry gracefully", async () => {
    const req = { params: { merchantId: "123" }, body: { orderId: "456" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    const mockError = new Error("Internal Server Error");

    jazzCashService.statusInquiry.mockRejectedValue(mockError);

    await jazzCashController.statusInquiry(req, res, next);

    expect(next).toHaveBeenCalledWith(mockError);
  });

  it("should handle non-500 status codes correctly", async () => {
    const req = { params: { merchantId: "123" }, body: { orderId: "456" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    const mockResult = { status: "error", statusCode: 500 };

    jazzCashService.statusInquiry.mockResolvedValue(mockResult);

    await jazzCashController.statusInquiry(req, res, next);

    expect(jazzCashService.statusInquiry).toHaveBeenCalledWith(req.body, "123");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult, "", 201));
    expect(next).not.toHaveBeenCalled();
  });
});

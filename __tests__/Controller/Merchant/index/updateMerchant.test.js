import merchantController from "../../../../dist/controller/merchant/index.js";
import { merchantService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { validationResult } from "express-validator";

jest.mock("../../../../dist/services/index.js");
jest.mock("express-validator", () => ({
    body: jest.fn().mockReturnValue({
      isEmail: jest.fn().mockReturnThis(),    // Mock isEmail
      withMessage: jest.fn().mockReturnThis(), // Mock withMessage
      notEmpty: jest.fn().mockReturnThis(),    // Mock notEmpty
      normalizeEmail: jest.fn().mockReturnThis(), // Mock normalizeEmail
      isLength: jest.fn().mockReturnThis(),    // Mock isLength
    }),
    validationResult: jest.fn().mockReturnValue({
      isEmpty: jest.fn().mockReturnValue(true),  // Default to no validation errors
      array: jest.fn().mockReturnValue([]),     // Empty error array
    }),
  }));
  

describe("Merchant Controller", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe("updateMerchant", () => {
    it("should return 200 and success message on successful update", async () => {
      mockReq.body = { merchantId: 1, username: "Merchant" };
      validationResult.mockReturnValue({ isEmpty: () => true });
      merchantService.updateMerchant.mockResolvedValue("Merchant updated successfully");

      await merchantController.updateMerchant(mockReq, mockRes, mockNext);

      expect(merchantService.updateMerchant).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success("Merchant updated successfully"));
    });

    it("should return 404 and validation error message if validation fails", async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: "Validation error" }],
      });

      await merchantController.updateMerchant(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Validation error" }));
    });

    it("should return custom error on service failure", async () => {
      const mockError = {
        statusCode: 500,
        message: 'Internal Server Error',
    };

    validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(true),
    });

    merchantService.updateMerchant.mockImplementation(() => {
        throw mockError;
    });

    await merchantController.updateMerchant(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(mockError.statusCode);
    expect(mockRes.send).toHaveBeenCalledWith(ApiResponse.error(mockError.message));
});
    
    
  });
});

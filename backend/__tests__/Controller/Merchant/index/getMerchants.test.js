import merchantController from "../../../../dist/controller/merchant/index.js";
import { merchantService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import { validationResult } from "express-validator";

jest.mock("../../../../dist/services/index.js");
jest.mock('express-validator', () => ({
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
  describe("getMerchants", () => {
    it("should return 200 and merchant list on success", async () => {
      const mockMerchants = [{ id: 1, name: "Merchant" }];
      merchantService.getMerchants.mockResolvedValue(mockMerchants);

      await merchantController.getMerchants(mockReq, mockRes, mockNext);

      expect(merchantService.getMerchants).toHaveBeenCalledWith(mockReq.query);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockMerchants));
    });

    it("should call next() with an error on service failure", async () => {
      const mockError = new Error("Service failure");
      merchantService.getMerchants.mockRejectedValue(mockError);

      await merchantController.getMerchants(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });
});
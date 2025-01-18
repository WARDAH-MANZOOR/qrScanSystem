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
  describe("addMerchant", () => {
    it("should return 200 and success message on successful addition", async () => {
      mockReq.body = { username: "Merchant", password: "123456" };
      validationResult.mockReturnValue({ isEmpty: () => true });
      merchantService.addMerchant.mockResolvedValue("Merchant created successfully");

      await merchantController.addMerchant(mockReq, mockRes, mockNext);

      expect(merchantService.addMerchant).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success("Merchant created successfully"));
    });

    it("should return 404 and validation error if validation fails", async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: "Validation error" }],
      });

      await merchantController.addMerchant(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Validation error" }));
    });

    it("should return 400 if settlement duration is missing", async () => {
      validationResult.mockReturnValue({ isEmpty: () => true });
      merchantService.addMerchant.mockResolvedValue("Settlment Duration Required");

      await merchantController.addMerchant(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith(ApiResponse.error("Settlment Duration Required"));
    });

    it("should return custom error on service failure", async () => {
      const mockError = new CustomError("Service failure", 500);
      merchantService.addMerchant.mockRejectedValue(mockError);

      await merchantController.addMerchant(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith(ApiResponse.error(mockError.message));
    });
  });
});

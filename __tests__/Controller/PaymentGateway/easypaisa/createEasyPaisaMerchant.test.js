
import { validationResult } from "express-validator";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import  createEasyPaisaMerchantController  from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock('../../../../dist/services/paymentGateway/easypaisa.js');
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
  
  describe("createEasyPaisaMerchant Controller", () => {
    let req, res, next;

    beforeEach(() => {
        req = { body: { name: "Merchant A", otherData: "value" } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it("should return status 400 with validation errors", async () => {
        const mockValidationError = {
            isEmpty: () => false,
            array: () => [{ msg: "Invalid input" }],
        };
        validationResult.mockReturnValue(mockValidationError);

        await createEasyPaisaMerchantController.createEasyPaisaMerchant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Invalid input" }));
        expect(next).not.toHaveBeenCalled();
    });

    it("should create a merchant and return success response", async () => {
        const newMerchant = { id: 1, name: "Merchant A" };
        easyPaisaService.createMerchant.mockResolvedValue(newMerchant);

        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });

        await createEasyPaisaMerchantController.createEasyPaisaMerchant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(newMerchant));
        expect(next).not.toHaveBeenCalled();
    });

    it("should handle server errors gracefully", async () => {
        const error = new Error("Server error");
        easyPaisaService.createMerchant.mockRejectedValue(error);

        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });

        await createEasyPaisaMerchantController.createEasyPaisaMerchant(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});
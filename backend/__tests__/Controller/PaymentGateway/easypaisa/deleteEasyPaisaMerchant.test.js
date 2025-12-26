import { validationResult } from "express-validator";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import deleteEasyPaisaMerchantController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

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
  describe("deleteEasyPaisaMerchant Controller", () => {
    let req, res, next;

    beforeEach(() => {
        req = { params: { merchantId: "1" } };
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

        await deleteEasyPaisaMerchantController.deleteEasyPaisaMerchant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Invalid input" }));
        expect(next).not.toHaveBeenCalled();
    });

    it("should return status 404 if merchant is not found", async () => {
        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });
        easyPaisaService.deleteMerchant.mockResolvedValue(null);

        await deleteEasyPaisaMerchantController.deleteEasyPaisaMerchant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant not found"));
        expect(next).not.toHaveBeenCalled();
    });

    it("should delete merchant and return success response", async () => {
        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });
        easyPaisaService.deleteMerchant.mockResolvedValue({ id: "1" });

        await deleteEasyPaisaMerchantController.deleteEasyPaisaMerchant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            ApiResponse.success({ message: "Merchant deleted successfully" })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it("should handle server errors gracefully", async () => {
        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });
        easyPaisaService.deleteMerchant.mockRejectedValue(new Error("Server error"));

        await deleteEasyPaisaMerchantController.deleteEasyPaisaMerchant(req, res, next);

        expect(next).toHaveBeenCalledWith(new Error("Server error"));
    });
});

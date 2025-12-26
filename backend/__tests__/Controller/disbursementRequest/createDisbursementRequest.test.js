import { validationResult } from "express-validator";
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import disbursementRequestService from "../../../dist/services/disbursementRequest/index.js";
import disbursementRequestController from "../../../dist/controller/disbursementRequest/index.js"

jest.mock("../../../dist/services/disbursementRequest/index.js");

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
  
describe("createDisbursementRequest", () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, user: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it("should return 200 and create disbursement request successfully", async () => {
        req.body.requested_amount = 1000;
        req.user.merchant_id = "merchant123";
        validationResult.mockReturnValue({ isEmpty: () => true });

        const result = { success: true, disbursementId: "disb123" };
        disbursementRequestService.createDisbursementRequest.mockResolvedValue(result);

        await disbursementRequestController.createDisbursementRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(result));
        expect(disbursementRequestService.createDisbursementRequest).toHaveBeenCalledWith(1000, "merchant123");
    });

    it("should return 400 if validation fails", async () => {
        validationResult.mockReturnValue({ isEmpty: () => false, array: () => [{ msg: "Invalid input" }] });

        await disbursementRequestController.createDisbursementRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Invalid input" }));
    });

    it("should return 500 if an unexpected error occurs", async () => {
        req.body.requested_amount = 1000;
        req.user.merchant_id = "merchant123";
        validationResult.mockReturnValue({ isEmpty: () => true });

        disbursementRequestService.createDisbursementRequest.mockRejectedValue(new Error("Internal Server Error"));

        await disbursementRequestController.createDisbursementRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error"));
    });
});

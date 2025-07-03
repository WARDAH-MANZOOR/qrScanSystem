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
  describe("updateDisbursementRequestStatus", () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it("should return 200 and update disbursement request status successfully", async () => {
        req.body.status = "approved";
        req.params.requestId = "123";
        validationResult.mockReturnValue({ isEmpty: () => true });

        const result = { success: true, requestId: "123", status: "approved" };
        disbursementRequestService.updateDisbursementRequestStatus.mockResolvedValue(result);

        await disbursementRequestController.updateDisbursementRequestStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(result));
        expect(disbursementRequestService.updateDisbursementRequestStatus).toHaveBeenCalledWith(123, "approved");
    });

    it("should return 400 if validation fails", async () => {
        validationResult.mockReturnValue({ isEmpty: () => false, array: () => [{ msg: "Invalid input" }] });

        await disbursementRequestController.updateDisbursementRequestStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Invalid input" }));
    });

    it("should return 500 if an unexpected error occurs", async () => {
        req.body.status = "approved";
        req.params.requestId = "123";
        validationResult.mockReturnValue({ isEmpty: () => true });

        disbursementRequestService.updateDisbursementRequestStatus.mockRejectedValue(new Error("Internal Server Error"));

        await disbursementRequestController.updateDisbursementRequestStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error"));
    });
});

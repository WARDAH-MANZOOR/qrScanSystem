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
  
describe("getDisbursementRequests", () => {
    let req, res;

    beforeEach(() => {
        req = { query: {}, user: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it("should return 200 and fetch disbursement requests successfully", async () => {
        req.query = { someParam: "value" };
        req.user.merchant_id = "merchant123";

        const result = [{ requestId: "123", amount: 1000 }];
        disbursementRequestService.getDisbursementRequests.mockResolvedValue(result);

        await disbursementRequestController.getDisbursementRequests(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(result));
        expect(disbursementRequestService.getDisbursementRequests).toHaveBeenCalledWith(req.query, "merchant123");
    });

    it("should return 500 if an unexpected error occurs", async () => {
        req.query = { someParam: "value" };
        req.user.merchant_id = "merchant123";

        disbursementRequestService.getDisbursementRequests.mockRejectedValue(new Error("Internal Server Error"));

        await disbursementRequestController.getDisbursementRequests(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error"));
    });
});

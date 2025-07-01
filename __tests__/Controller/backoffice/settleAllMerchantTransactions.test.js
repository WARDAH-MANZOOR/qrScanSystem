import { backofficeService } from "../../../dist/services/index.js";
import backofficecontroller from "../../../dist/controller/backoffice/backoffice.js";
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import CustomError from "../../../dist/utils/custom_error.js";

describe("settleAllMerchantTransactions", () => {
    let req, res;
  
    beforeEach(() => {
      req = {
        params: {},
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      };
      jest.clearAllMocks();
    });
  
    it("should return 200 and success response when Merchant Id is provided", async () => {
      req.params.merchantId = "123";
  
      const mockResult = "All Transactions Settled";
      backofficeService.settleAllMerchantTransactions = jest.fn().mockResolvedValue(mockResult);
  
      await backofficecontroller.settleAllMerchantTransactions(req, res);
  
      expect(backofficeService.settleAllMerchantTransactions).toHaveBeenCalledWith(123);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
    });
  
    it("should throw an error if Merchant Id is not provided", async () => {
      await backofficecontroller.settleAllMerchantTransactions(req, res);
  
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        ApiResponse.error("Merchant Id must be given", 404)
      );
    });
  
    it("should handle unexpected errors and return 500", async () => {
      req.params.merchantId = "123";
  
      backofficeService.settleAllMerchantTransactions = jest
        .fn()
        .mockRejectedValue(new Error("Unexpected Error"));
  
      await backofficecontroller.settleAllMerchantTransactions(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        ApiResponse.error("Unexpected Error", 500)
      );
    });
  });
  
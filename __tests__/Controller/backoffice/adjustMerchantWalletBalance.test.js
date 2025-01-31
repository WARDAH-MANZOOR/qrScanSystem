import backofficecontroller from "../../../dist/controller/backoffice/backoffice.js";
import {backofficeService} from "../../../dist/services/index.js";
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import CustomError from "../../../dist/utils/custom_error.js";

jest.mock("../../../dist/services/index.js", () => ({
    backofficeService: {
      adjustMerchantWalletBalance: jest.fn(),
    },
  }));
  

  beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("adjustMerchantWalletBalance", () => {
    let req, res;
  
    beforeEach(() => {
      req = {
        params: {},
        body: {},
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      };
      jest.clearAllMocks();
    });
  
    it("should return 200 and success response when Merchant Id and target are provided", async () => {
      req.params.merchantId = "123";
      req.body.target = 500;
  
      backofficeService.adjustMerchantWalletBalance = jest.fn().mockResolvedValue("Balance Adjusted");
  
      await backofficecontroller.adjustMerchantWalletBalance(req, res);
  
      expect(backofficeService.adjustMerchantWalletBalance).toHaveBeenCalledWith(123, 500);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(ApiResponse.success("Balance Adjusted"));
    });
  
    it("should throw an error if Merchant Id is not provided", async () => {
      req.body.target = 500;
  
      await backofficecontroller.adjustMerchantWalletBalance(req, res);
  
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        ApiResponse.error("Merchant Id and target balance must be given", 404)
      );
    });
  
    it("should throw an error if target balance is not provided", async () => {
      req.params.merchantId = "123";
  
      await backofficecontroller.adjustMerchantWalletBalance(req, res);
  
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        ApiResponse.error("Merchant Id and target balance must be given", 404)
      );
    });
  
    it("should handle unexpected errors and return 500", async () => {
      req.params.merchantId = "123";
      req.body.target = 500;
  
      backofficeService.adjustMerchantWalletBalance = jest
        .fn()
        .mockRejectedValue(new Error("Unexpected Error"));
  
      await backofficecontroller.adjustMerchantWalletBalance(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        ApiResponse.error("Unexpected Error", 500)
      );
    });
  });
  
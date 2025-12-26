import backofficecontroller from "../../../dist/controller/backoffice/backoffice.js";
import {backofficeService} from "../../../dist/services/index.js";
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import CustomError from "../../../dist/utils/custom_error.js";

jest.mock("../../../dist/services/index.js");
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("adjustMerchantWalletBalanceWithoutSettlement", () => {
    let req, res;

    beforeEach(() => {
        req = { params: {}, body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it("should return 200 and adjust the balance successfully", async () => {
        req.params.merchantId = "123";
        req.body.target = 5000;
        const result = { success: true, newBalance: 5000 };

        backofficeService.adjustMerchantWalletBalanceWithoutSettlement.mockResolvedValue(result);

        await backofficecontroller.adjustMerchantWalletBalanceWithoutSettlement(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(result));
        expect(backofficeService.adjustMerchantWalletBalanceWithoutSettlement).toHaveBeenCalledWith(123, 5000, true);
    });

    it("should return 404 if merchantId is missing", async () => {
        req.body.target = 5000;

        await backofficecontroller.adjustMerchantWalletBalanceWithoutSettlement(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error("Merchant Id and target balance must be given", 404));
    });

    it("should return 404 if target balance is missing", async () => {
        req.params.merchantId = "123";

        await backofficecontroller.adjustMerchantWalletBalanceWithoutSettlement(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error("Merchant Id and target balance must be given", 404));
    });

    it("should return 500 if an unexpected error occurs", async () => {
        req.params.merchantId = "123";
        req.body.target = 5000;

        backofficeService.adjustMerchantWalletBalanceWithoutSettlement.mockRejectedValue(new Error("Internal Server Error"));

        await backofficecontroller.adjustMerchantWalletBalanceWithoutSettlement(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error", 500));
    });
});

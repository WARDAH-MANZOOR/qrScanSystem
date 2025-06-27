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
  
describe("settleTransactionsForTelegram", () => {
    let req, res;

    beforeEach(() => {
        req = { body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it("should return 200 and settle the transaction successfully", async () => {
        req.body.transactionId = "tx123";
        const result = { success: true, transactionId: "tx123" };

        backofficeService.settleTransactions.mockResolvedValue(result);

        await backofficecontroller.settleTransactionsForTelegram(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(result));
        expect(backofficeService.settleTransactions).toHaveBeenCalledWith(["tx123"], false);
    });

    it("should return 500 if an unexpected error occurs", async () => {
        req.body.transactionId = "tx123";

        backofficeService.settleTransactions.mockRejectedValue(new Error("Internal Server Error"));

        await backofficecontroller.settleTransactionsForTelegram(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error", 500));
    });
});

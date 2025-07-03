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
  describe("payoutCallback", () => {
    let req, res;

    beforeEach(() => {
        req = { body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it("should return 200 and process payout callback successfully", async () => {
        req.body.transactionIds = ["tx789", "tx987"];
        const result = { success: true, processedTransactions: ["tx789", "tx987"] };

        backofficeService.payoutCallback.mockResolvedValue(result);

        await backofficecontroller.payoutCallback(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(result));
        expect(backofficeService.payoutCallback).toHaveBeenCalledWith(["tx789", "tx987"]);
    });

    it("should return 400 if no transaction IDs are provided", async () => {
        req.body.transactionIds = [];

        await backofficecontroller.payoutCallback(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error("One id must be given", 500));
    });

    it("should return 500 if an unexpected error occurs", async () => {
        req.body.transactionIds = ["tx789"];

        backofficeService.payoutCallback.mockRejectedValue(new Error("Internal Server Error"));

        await backofficecontroller.payoutCallback(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error", 500));
    });
});

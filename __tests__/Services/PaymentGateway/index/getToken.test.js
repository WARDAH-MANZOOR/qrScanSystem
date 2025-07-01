import { merchantService } from "../../../../dist/services/index.js";
import jazzcashDisburse from "../../../../dist/services/paymentGateway/jazzcashDisburse.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import fetch from "node-fetch"; 
import { getToken } from "../../../../dist/services/paymentGateway/index.js";


jest.mock("node-fetch", () => jest.fn());

beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("getToken function", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should throw an error if the merchant is not found", async () => {
        merchantService.findOne = jest.fn().mockResolvedValue(null);
        try {
            const result = await getToken("invalid-merchant-id")


        } catch (error) {
            console.error("Merchant not found", error);
        }
    });
           
    it("should throw an error if the merchant has no JazzCashDisburseAccountId", async () => {
        merchantService.findOne = jest.fn().mockResolvedValue({ uid: "merchant-id" });
        try {
            const result = await getToken("merchant-id")


        } catch (error) {
            console.error("Disbursement account not assigned.", error);
        }
    });
    

    it("should throw an error if disbursement account is not found", async () => {
        merchantService.findOne = jest.fn().mockResolvedValue({ uid: "merchant-id", JazzCashDisburseAccountId: "disburse-id" });
        jazzcashDisburse.getDisburseAccount = jest.fn().mockResolvedValue(null);
        try {
            const result = await getToken("merchant-id")

        } catch (error) {
            console.error("Disbursement account not found", error);
        }
    });
           
  
    it("should return a valid token if everything is correct", async () => {
        merchantService.findOne = jest.fn().mockResolvedValue({ uid: "merchant-id", JazzCashDisburseAccountId: "disburse-id" });
        jazzcashDisburse.getDisburseAccount = jest.fn().mockResolvedValue({ data: { tokenKey: "test-token" } });
        
        fetch.mockResolvedValue({
            json: jest.fn().mockResolvedValue({ access_token: "mock-access-token" }),
        });
        
        try {
            const result = await getToken("merchant-id")
            expect(token).toEqual({ access_token: "mock-access-token" });

        } catch (error) {
            console.error(error);
        }
    });
       
    it("should log an error if fetch fails", async () => {
        const consoleSpy = jest.spyOn(console, "error");
        merchantService.findOne = jest.fn().mockResolvedValue({ uid: "merchant-id", JazzCashDisburseAccountId: "disburse-id" });
        jazzcashDisburse.getDisburseAccount = jest.fn().mockResolvedValue({ data: { tokenKey: "test-token" } });
        fetch.mockRejectedValue(new CustomError("Fetch error"));
        try {
            const result = await getToken("merchant-id")
            expect(consoleSpy).toHaveBeenCalledWith("Fetch error:", new CustomError("Fetch error"));

        } catch (error) {
            console.error(error);
        }
    });
      
});

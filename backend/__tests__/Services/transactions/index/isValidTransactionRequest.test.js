import { isValidTransactionRequest } from "../../../../dist/services/transactions/index"; // Replace with actual path

describe("isValidTransactionRequest", () => {
    it("should return an error if transaction id is missing", () => {
        const data = { original_amount: 100, type: "wallet" };
        const result = isValidTransactionRequest(data);
        expect(result).toEqual([
            { msg: "Invalid Transaction Id", param: "id" },
        ]);
    });

    it("should return an error if transaction id doesn't start with 'T'", () => {
        const data = { id: "12345", original_amount: 100, type: "wallet" };
        const result = isValidTransactionRequest(data);
        expect(result).toEqual([
            { msg: "Invalid Transaction Id", param: "id" },
        ]);
    });

    it("should return an error if original_amount is missing", () => {
        const data = { id: "T12345", type: "wallet" };
        const result = isValidTransactionRequest(data);
        expect(result).toEqual([
            { msg: "Original amount must be a positive number", param: "original_amount" },
        ]);
    });

    it("should return an error if original_amount is not a positive number", () => {
        const data = { id: "T12345", original_amount: -50, type: "wallet" };
        const result = isValidTransactionRequest(data);
        expect(result).toEqual([
            { msg: "Original amount must be a positive number", param: "original_amount" },
        ]);
    });

    it("should return an error if original_amount is not a number", () => {
        const data = { id: "T12345", original_amount: "abc", type: "wallet" };
        const result = isValidTransactionRequest(data);
        expect(result).toEqual([
            { msg: "Original amount must be a positive number", param: "original_amount" },
        ]);
    });

    it("should return an error if type is missing", () => {
        const data = { id: "T12345", original_amount: 100 };
        const result = isValidTransactionRequest(data);
        expect(result).toEqual([
            { msg: "Invalid transaction type", param: "type" },
        ]);
    });

    it("should return an error if type is not in the valid types list", () => {
        const data = { id: "T12345", original_amount: 100, type: "cash" };
        const result = isValidTransactionRequest(data);
        expect(result).toEqual([
            { msg: "Invalid transaction type", param: "type" },
        ]);
    });

    it("should pass validation if all fields are correct", () => {
        const data = { id: "T12345", original_amount: 100, type: "wallet" };
        const result = isValidTransactionRequest(data);
        expect(result).toEqual([]);
    });

    it("should pass validation if type is 'card'", () => {
        const data = { id: "T12345", original_amount: 100, type: "card" };
        const result = isValidTransactionRequest(data);
        expect(result).toEqual([]);
    });

    it("should pass validation if type is 'bank'", () => {
        const data = { id: "T12345", original_amount: 100, type: "bank" };
        const result = isValidTransactionRequest(data);
        expect(result).toEqual([]);
    });
});

import { isValidTransactionCompletion } from "../../../../dist/services/transactions/index.js"; // Replace with actual path

describe("isValidTransactionCompletion", () => {
    it("should return an error if transaction_id is missing", () => {
        const data = { status: "completed" };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([
            { msg: "Transaction ID must be a string", param: "transaction_id" },
        ]);
    });

    it("should return an error if transaction_id doesn't start with 'T'", () => {
        const data = { transaction_id: "12345", status: "completed" };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([
            { msg: "Transaction ID must be a string", param: "transaction_id" },
        ]);
    });

    it("should return an error if status is missing", () => {
        const data = { transaction_id: "T12345" };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([
            { msg: "Invalid transaction status", param: "status" },
        ]);
    });

    it("should return an error if status is not 'completed' or 'failed'", () => {
        const data = { transaction_id: "T12345", status: "pending" };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([
            { msg: "Invalid transaction status", param: "status" },
        ]);
    });

    it("should return an error if provider name is missing", () => {
        const data = { transaction_id: "T12345", status: "completed", provider: { type: "online", version: "1.0" } };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([
            { msg: "Provider name must be a string", param: "provider.name" },
        ]);
    });

    it("should return an error if provider name is not a string", () => {
        const data = { transaction_id: "T12345", status: "completed", provider: { name: 123, type: "online", version: "1.0" } };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([
            { msg: "Provider name must be a string", param: "provider.name" },
        ]);
    });

    it("should return an error if provider type is missing", () => {
        const data = { transaction_id: "T12345", status: "completed", provider: { name: "ProviderA", version: "1.0" } };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([
            { msg: "Provider transaction type must be a string", param: "provider.type" },
        ]);
    });

    it("should return an error if provider type is not a string", () => {
        const data = { transaction_id: "T12345", status: "completed", provider: { name: "ProviderA", type: 123, version: "1.0" } };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([
            { msg: "Provider transaction type must be a string", param: "provider.type" },
        ]);
    });

    it("should return an error if provider version is missing", () => {
        const data = { transaction_id: "T12345", status: "completed", provider: { name: "ProviderA", type: "online" } };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([
            { msg: "Provider version must be a string", param: "provider.version" },
        ]);
    });

    it("should return an error if provider version is not a string", () => {
        const data = { transaction_id: "T12345", status: "completed", provider: { name: "ProviderA", type: "online", version: 1.0 } };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([
            { msg: "Provider version must be a string", param: "provider.version" },
        ]);
    });

    it("should pass validation if all fields are correct", () => {
        const data = { transaction_id: "T12345", status: "completed", provider: { name: "ProviderA", type: "online", version: "1.0" } };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([]);
    });

    it("should pass validation if provider object is missing", () => {
        const data = { transaction_id: "T12345", status: "completed" };
        const result = isValidTransactionCompletion(data);
        expect(result).toEqual([]);
    });
});

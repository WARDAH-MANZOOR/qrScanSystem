import { Decimal } from "@prisma/client/runtime/library";
import { calculateDisbursement } from "../../../../dist/services/paymentGateway/disbursement.js"; // Update the path to your function
import CustomError from "../../../../dist/utils/custom_error";

describe("calculateDisbursement", () => {
    it("should fully disburse from multiple transactions when sufficient funds are available", () => {
        const transactions = [
            { transaction_id: "txn1", balance: new Decimal(100) },
            { transaction_id: "txn2", balance: new Decimal(200) },
        ];
        const amount = new Decimal(150);

        const result = calculateDisbursement(transactions, amount);

        expect(result).toEqual({
            updates: [
                { transaction_id: "txn1", disbursed: true, balance: new Decimal(0) },
                { transaction_id: "txn2", disbursed: false, balance: new Decimal(150) }, // Adjusted expected balance
            ],
            totalDisbursed: new Decimal(150),
        });
        
    });

    it("should partially disburse from the first transaction when the requested amount is less than its balance", () => {
        const transactions = [
            { transaction_id: "txn1", balance: new Decimal(100) },
            { transaction_id: "txn2", balance: new Decimal(200) },
        ];
        const amount = new Decimal(50);

        const result = calculateDisbursement(transactions, amount);

        expect(result).toEqual({
            updates: [
                { transaction_id: "txn1", disbursed: false, balance: new Decimal(50) },
            ],
            totalDisbursed: new Decimal(50),
        });
    });

    it("should throw an error when insufficient funds are available", () => {
        const transactions = [
            { transaction_id: "txn1", balance: new Decimal(50) },
            { transaction_id: "txn2", balance: new Decimal(30) },
        ];
        const amount = new Decimal(100);

        expect(() => calculateDisbursement(transactions, amount)).toThrow(
            new CustomError("Insufficient funds to disburse the requested amount", 400)
        );
    });

    it("should fully disburse all transactions when the requested amount matches the total balance", () => {
        const transactions = [
            { transaction_id: "txn1", balance: new Decimal(50) },
            { transaction_id: "txn2", balance: new Decimal(50) },
        ];
        const amount = new Decimal(100);

        const result = calculateDisbursement(transactions, amount);

        expect(result).toEqual({
            updates: [
                { transaction_id: "txn1", disbursed: true, balance: new Decimal(0) },
                { transaction_id: "txn2", disbursed: true, balance: new Decimal(0) },
            ],
            totalDisbursed: new Decimal(100),
        });
    });

    it("should handle an empty transaction list and throw an error", () => {
        const transactions = [];
        const amount = new Decimal(100);

        expect(() => calculateDisbursement(transactions, amount)).toThrow(
            new CustomError("Insufficient funds to disburse the requested amount", 400)
        );
    });
});

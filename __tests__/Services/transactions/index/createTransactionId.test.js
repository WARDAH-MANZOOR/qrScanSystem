import { format } from "date-fns";
import { jest } from "@jest/globals";
import transactionsService from "../../../../dist/services/transactions/index.js"; // Adjust import paths as necessary

describe("createTransactionId", () => {

    it('should generate unique transaction IDs each time', () => {
        const txnRefNo1 = transactionsService.createTransactionId();
        const txnRefNo2 = transactionsService.createTransactionId();
        expect(txnRefNo1).not.toBe(txnRefNo2);
    });

    it('should handle multiple transaction IDs generation in quick succession', () => {
        const txnRefNo1 = transactionsService.createTransactionId();
        const txnRefNo2 = transactionsService.createTransactionId();
        const txnRefNo3 = transactionsService.createTransactionId();
        
        // Ensuring uniqueness even if generated in quick succession
        expect(txnRefNo1).not.toBe(txnRefNo2);
        expect(txnRefNo1).not.toBe(txnRefNo3);
        expect(txnRefNo2).not.toBe(txnRefNo3);
    });

    it('should ensure that the timestamp portion of the transaction ID corresponds to the current time', () => {
        const txnRefNo = transactionsService.createTransactionId();
        const txnDateTimePart = txnRefNo.substring(1, 15); // Extract the date-time part
        const expectedTxnDateTime = format(new Date(), "yyyyMMddHHmmss");
        
        // Verify that the date-time portion of the ID is close to the current time
        expect(txnDateTimePart).toBe(expectedTxnDateTime);
    });

 
});
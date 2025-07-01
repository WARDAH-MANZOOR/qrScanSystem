import { createTransactionReferenceNumber } from '../../../../dist/services/paymentGateway/jazzCash.js'; // Adjust the import path

describe('createTransactionReferenceNumber', () => {


    it('should return the transaction_id if provided in paymentData', () => {
        const paymentData = { transaction_id: 'TX123456' };
        const txnDateTime = '20250108';
        const fractionalMilliseconds = 123;
        
        const result = createTransactionReferenceNumber(paymentData, txnDateTime, fractionalMilliseconds);
        expect(result).toBe('TX123456');
    });

    test('should generate a new reference number if transaction_id is not provided', () => {
        const paymentData = {}; // No transaction_id provided
        const txnDateTime = '20250118';
        const fractionalMilliseconds = 567;
    
        const result = createTransactionReferenceNumber(paymentData, txnDateTime, fractionalMilliseconds);
    
        expect(result).toMatch(new RegExp(`^T20250118567[a-z0-9]{4}$`)); // Matches expected format
    });
    
    test('should include txnDateTime and fractionalMilliseconds in generated reference number', () => {
        const paymentData = {}; // No transaction_id provided
        const txnDateTime = '20250118';
        const fractionalMilliseconds = 567;
    
        const result = createTransactionReferenceNumber(paymentData, txnDateTime, fractionalMilliseconds);
    
        expect(result.startsWith(`T20250118567`)).toBe(true);
    });
    
});

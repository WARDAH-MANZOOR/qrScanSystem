import { calculateSettledAmount } from '../../../../dist/services/paymentGateway/jazzCash.js'; // Adjust the import path

describe('calculateSettledAmount', () => {
    
    it('should correctly calculate the settled amount with valid commission values', () => {
        const amount = 1000;
        const commissions = [{
            commissionRate: 0.1, // 10% commission
            commissionGST: 0.05, // 5% GST
            commissionWithHoldingTax: 0.02 // 2% withholding tax
        }];
        
        const result = calculateSettledAmount(amount, commissions);
        expect(result).toBe(1000 * (1 - (0.1 + 0.05 + 0.02))); // Expected result = 1000 * (1 - 0.17) = 830
    });

    it('should correctly calculate the settled amount when commission rates are 0', () => {
        const amount = 1000;
        const commissions = [{
            commissionRate: 0, // 0% commission
            commissionGST: 0, // 0% GST
            commissionWithHoldingTax: 0 // 0% withholding tax
        }];
        
        const result = calculateSettledAmount(amount, commissions);
        expect(result).toBe(amount); // No commission, so the amount remains the same
    });

    it('should correctly handle a large amount with small commission rates', () => {
        const amount = 1000000;
        const commissions = [{
            commissionRate: 0.05, // 5% commission
            commissionGST: 0.02, // 2% GST
            commissionWithHoldingTax: 0.01 // 1% withholding tax
        }];
        
        const result = calculateSettledAmount(amount, commissions);
        expect(result).toBe(1000000 * (1 - (0.05 + 0.02 + 0.01))); // Expected result = 1000000 * (1 - 0.08) = 920000
    });

    

    it('should return a positive amount even if the commission rate is small but GST or withholding tax is large', () => {
        const amount = 1000;
        const commissions = [{
            commissionRate: 0.05, // 5% commission
            commissionGST: 0.3, // 30% GST
            commissionWithHoldingTax: 0.2 // 20% withholding tax
        }];
        
        const result = calculateSettledAmount(amount, commissions);
        expect(result).toBe(1000 * (1 - (0.05 + 0.3 + 0.2))); // Expected result = 1000 * (1 - 0.55) = 450
    });

    it('should handle negative commission rates correctly', () => {
        const amount = 1000;
        const commissions = [{
            commissionRate: -0.05, // -5% commission (indicating a rebate or negative commission)
            commissionGST: 0.05, // 5% GST
            commissionWithHoldingTax: 0.05 // 5% withholding tax
        }];
        
        const result = calculateSettledAmount(amount, commissions);
        expect(result).toBe(1000 * (1 - (-0.05 + 0.05 + 0.05))); // Expected result = 1000 * (1 - 0.05) = 950
    });

});

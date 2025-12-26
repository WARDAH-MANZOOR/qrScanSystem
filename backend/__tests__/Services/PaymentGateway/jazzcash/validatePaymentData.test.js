import { validatePaymentData } from '../../../../dist/services/paymentGateway/jazzCash.js'; // Adjust the import path

import CustomError from '../../../../dist/utils/custom_error.js';

describe('validatePaymentData', () => {

    it('should throw an error if amount is missing', () => {
        const paymentData = { phone: '1234567890', redirect_url: 'https://example.com', type: 'credit' };
        expect(() => validatePaymentData(paymentData)).toThrow(new CustomError("Amount and phone are required", 400));
    });

    it('should throw an error if phone is missing', () => {
        const paymentData = { amount: 100, redirect_url: 'https://example.com', type: 'credit' };
        expect(() => validatePaymentData(paymentData)).toThrow(new CustomError("Amount and phone are required", 400));
    });

    it('should throw an error if redirect_url is missing', () => {
        const paymentData = { amount: 100, phone: '1234567890', type: 'credit' };
        expect(() => validatePaymentData(paymentData)).toThrow(new CustomError("Redirect URL is required", 400));
    });

    it('should throw an error if type is missing', () => {
        const paymentData = { amount: 100, phone: '1234567890', redirect_url: 'https://example.com' };
        expect(() => validatePaymentData(paymentData)).toThrow(new CustomError("Payment type is required", 400));
    });

    it('should not throw an error if all required fields are provided', () => {
        const paymentData = { amount: 100, phone: '1234567890', redirect_url: 'https://example.com', type: 'credit' };
        expect(() => validatePaymentData(paymentData)).not.toThrow();
    });
});

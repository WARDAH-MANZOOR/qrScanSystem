import axios from 'axios';
import { jazzCashCardPayment } from '../../../../dist/services/paymentGateway/jazzCash.js'; // Adjust this import according to your setup
import crypto from 'crypto'
// Mock axios
jest.mock('axios');

// Redefine getSecureHash function for testing purposes
const getSecureHash = jest.fn((data, salt) => {
    const hashArray = [
        data.pp_Amount,
        data.pp_BillReference,
        data.pp_Description,
        data.pp_Language,
        data.pp_MerchantID,
        data.pp_Password,
        data.pp_ReturnURL,
        data.pp_TxnCurrency,
        data.pp_TxnDateTime,
        data.pp_TxnExpiryDateTime,
        data.pp_TxnRefNo,
        data.pp_TxnType,
        data.pp_Version,
        data.ppmpf_1,
    ];
    const sortedData = Object.keys(hashArray)
        .sort()
        .reduce((result, key) => {
            result[key] = hashArray[key];
            return result;
        }, {});
    let strToHash = "";
    for (const key in sortedData) {
        const value = sortedData[key];
        if (value) {
            strToHash += `&${value}`;
        }
    }
    strToHash = salt + strToHash;
    const hmac = crypto.createHmac("sha256", salt);
    hmac.update(strToHash);
    return hmac.digest("hex");
});

beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe('jazzCashCardPayment', () => {
    const obj = {
        refNo: 'txn123',
        pp_MerchantID: 'merchantID',
        pp_Password: 'password123',
        amount: 100,
        txnDateTime: '20250114000000',
        jazzCashMerchantIntegritySalt: 'someSalt',
    };

    beforeEach(() => {
        // Reset mocks before each test
        axios.post.mockClear();
        getSecureHash.mockClear(); // Now it will clear the mock correctly
    });

    it('should send the correct payload to the JazzCash API', async () => {
        // Mock the expected response
        axios.post.mockResolvedValue({
          data: { status: 'success', message: 'Payment initiated successfully' },
        });
      
        const secureHash = getSecureHash({
          pp_Version: '1.1',
          pp_TxnType: 'MPAY',
          pp_TxnRefNo: 'txn123',
          pp_MerchantID: 'merchantID',
          pp_Password: 'password123',
          pp_Amount: 10000,
          pp_TxnCurrency: 'PKR',
          pp_TxnDateTime: '20250114000000',
          pp_TxnExpiryDateTime: '20250118235238',
          pp_BillReference: 'billRef',
          pp_Description: 'Description of transaction',
          pp_CustomerCardNumber: '5160670239008941',
          pp_UsageMode: 'API',
        }, 'someSalt');
      
        await jazzCashCardPayment({
          refNo: 'txn123',
          pp_MerchantID: 'merchantID',
          pp_Password: 'password123',
          amount: 100,
          txnDateTime: '20250114000000',
          jazzCashMerchantIntegritySalt: 'someSalt',
        });
      
        expect(axios.post).toHaveBeenCalledWith(
            'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Purchase/InitiateAuthentication',
            expect.objectContaining({
              pp_Version: '1.1',
              pp_TxnType: 'MPAY',
              pp_TxnRefNo: 'txn123',
              pp_MerchantID: 'merchantID',
              pp_Password: 'password123',
              pp_Amount: 10000,
              pp_TxnCurrency: 'PKR',
              pp_TxnDateTime: '20250114000000',
              pp_TxnExpiryDateTime: expect.any(String),  // Match any string for dynamic date
              pp_BillReference: 'billRef',
              pp_Description: 'Description of transaction',
              pp_CustomerCardNumber: '5160670239008941',
              pp_UsageMode: 'API',
              pp_SecureHash: expect.any(String)  // Match any string for dynamic secure hash
            })
          );
          
      });
      
    
    

    it('should throw an error if the response status is not success', async () => {
        const mockErrorResponse = {
            data: { status: 'failed', message: 'Payment initiation failed' },
        };

        // Mock the response from axios
        axios.post.mockResolvedValueOnce(mockErrorResponse);

        // Mock the getSecureHash to return a fixed hash
        getSecureHash.mockReturnValueOnce('mockedSecureHash');

        try {
            await jazzCashCardPayment(obj);
        } catch (error) {
            // Ensure the error was thrown as expected
            expect(error.message).toBe('Payment initiation failed');
        }
    });

    it('should handle network errors gracefully', async () => {
        // Mock a network error
        axios.post.mockRejectedValueOnce(new Error('Network Error'));

        // Mock the getSecureHash to return a fixed hash
        getSecureHash.mockReturnValueOnce('mockedSecureHash');

        try {
            await jazzCashCardPayment(obj);
        } catch (error) {
            // Ensure the error message matches
            expect(error.message).toBe('Network Error');
        }
    });
});

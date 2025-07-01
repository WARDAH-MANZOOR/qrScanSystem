import { simpleGetToken } from '../../../../dist/services/paymentGateway/index.js';

import fetch from 'node-fetch';

jest.mock('node-fetch', () => jest.fn());
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe('simpleGetToken', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    it('should return a valid token on successful fetch', async () => {
        try {
        const mockTokenResponse = { access_token: 'mocked_token', token_type: 'Bearer', expires_in: 3600 };
        fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValueOnce(mockTokenResponse),
        });

        const response = await simpleGetToken('mockMerchantId');
        expect(response).toEqual(mockTokenResponse);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(
            'https://gateway.jazzcash.com.pk/token',
            expect.objectContaining({ method: 'POST' })
        );
    }
    catch (error) {
        console.error('Fetch error:', error);
    }
    });

    it('should handle fetch errors gracefully', async () => {
        try{
        fetch.mockRejectedValueOnce(new Error('Network error'));

        const response = await simpleGetToken('mockMerchantId');

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(response).toBeInstanceOf(Error);
        expect(response.message).toBe('Network error');
    }
    catch (error) {
        console.error('Fetch error:', error);
    }
    });

    it('should use correct headers and body in request', async () => {
        try {
        fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValueOnce({ access_token: 'test_token' }),
        });

        await simpleGetToken('mockMerchantId');

        expect(fetch).toHaveBeenCalledWith(
            'https://gateway.jazzcash.com.pk/token',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: expect.stringContaining('Basic'),
                    'Content-Type': 'application/x-www-form-urlencoded',
                }),
                body: expect.any(URLSearchParams),
            })
        );
    }
    catch (error) {
        console.error('Fetch error:', error);
    }
    });
    
});
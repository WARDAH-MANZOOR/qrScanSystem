import fetch from 'node-fetch'; // Import node-fetch to mock it
import zindigiService from '../../../../dist/services/paymentGateway/zindigi.js';

describe('fetchExistingClientSecret', () => {
  const mockUrl = 'https://z-sandbox.jsbl.com/zconnect/client/oauth-blb';
  const mockHeaders = { 'Content-Type': 'application/json', clientId: '509200T1B603i' };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(global, 'fetch'); // Mock fetch globally
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  });
  
  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
  

  it('should return clientSecret and organizationId on a successful response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payLoad: {
          clientSecret: 'mockClientSecret',
          organizationId: 'mockOrganizationId',
        },
      }),
    });

    const result = await zindigiService.fetchExistingClientSecret();

    expect(global.fetch).toHaveBeenCalledWith(mockUrl, {
      method: 'GET',
      headers: mockHeaders,
    });
    expect(result).toEqual({
      clientSecret: 'mockClientSecret',
      organizationId: 'mockOrganizationId',
    });
  });

  it('should throw an error if the response is not ok', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(zindigiService.fetchExistingClientSecret()).rejects.toThrow(
      'Failed to fetch client secret. Status: 404'
    );
  });

  it('should throw an error if fetch fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network Error'));

    await expect(zindigiService.fetchExistingClientSecret()).rejects.toThrow(
      'Network Error'
    );
  });

  it('should handle unexpected response structure gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // Unexpected structure
    });

    await expect(zindigiService.fetchExistingClientSecret()).rejects.toThrow(
      'Cannot read properties of undefined (reading \u0027clientSecret\u0027)'
    );
  });
});

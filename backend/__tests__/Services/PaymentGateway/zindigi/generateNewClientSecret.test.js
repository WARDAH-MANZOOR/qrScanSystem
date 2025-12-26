import zindigiService from '../../../../dist/services/paymentGateway/zindigi.js';

describe('generateNewClientSecret', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(global, 'fetch'); // Mock fetch globally
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  });
  
  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });

  test('should return clientSecret and organizationId on a successful response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payLoad: {
          clientSecret: 'mockClientSecret123',
          organizationId: 'mockOrganizationId456',
        },
      }),
    });

    const result = await zindigiService.generateNewClientSecret();

    expect(result).toEqual({
      clientSecret: 'mockClientSecret123',
      organizationId: 'mockOrganizationId456',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('should throw an error if the response is not ok', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    await expect(zindigiService.generateNewClientSecret()).rejects.toThrow(
      'Failed to generate new client secret. Status: 404'
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('should throw an error if fetch fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network Error'));

    await expect(zindigiService.generateNewClientSecret()).rejects.toThrow('Network Error');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('should return undefined for missing properties in the response', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        payLoad: {
          unexpectedKey: 'unexpectedValue', // Missing clientSecret and organizationId
        },
      }),
    });

    const result = await zindigiService.generateNewClientSecret();
    
    expect(result).toEqual({
      clientSecret: undefined,
      organizationId: undefined,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

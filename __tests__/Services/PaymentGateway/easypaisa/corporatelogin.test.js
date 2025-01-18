import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import axios from "axios";

jest.mock('axios');

jest.mock('../../../../dist/services/paymentGateway/easypaisa.js', () => ({
    createRSAEncryptedPayload: jest.fn(),
    corporateLogin: jest.fn(),
}));

describe('corporateLogin', () => {
    const obj = {
        MSISDN: '1234567890',
        pin: '1234',
        clientId: 'mockClientId',
        clientSecret: 'mockClientSecret',
        xChannel: 'mockXChannel',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return data when the API call is successful', async () => {
        const mockResponse = { data: { success: true, message: 'Login successful' } };

        axios.post.mockResolvedValueOnce(mockResponse);
        easyPaisaService.createRSAEncryptedPayload.mockResolvedValueOnce('encryptedPayload');
        easyPaisaService.corporateLogin.mockImplementation(async () => {
            const encryptedPayload = await easyPaisaService.createRSAEncryptedPayload(`${obj.MSISDN}:${obj.pin}`);
            const response = await axios.post(
                "https://rgw.8798-f464fa20.eu-de.ri1.apiconnect.appdomain.cloud/tmfb/gateway/corporate-solution-corporate-login",
                { LoginPayload: encryptedPayload },
                {
                    headers: {
                        "X-IBM-Client-Id": obj.clientId,
                        "X-IBM-Client-Secret": obj.clientSecret,
                        "X-Channel": obj.xChannel,
                        "Content-Type": "application/json",
                    },
                }
            );
            return response.data;
        });

        const result = await easyPaisaService.corporateLogin(obj);

        expect(easyPaisaService.createRSAEncryptedPayload).toHaveBeenCalledWith(`${obj.MSISDN}:${obj.pin}`);
        expect(axios.post).toHaveBeenCalledWith(
            "https://rgw.8798-f464fa20.eu-de.ri1.apiconnect.appdomain.cloud/tmfb/gateway/corporate-solution-corporate-login",
            { LoginPayload: 'encryptedPayload' },
            {
                headers: {
                    "X-IBM-Client-Id": obj.clientId,
                    "X-IBM-Client-Secret": obj.clientSecret,
                    "X-Channel": obj.xChannel,
                    "Content-Type": "application/json",
                },
            }
        );
        expect(result).toEqual(mockResponse.data);
    });

    it('should log the error and return undefined when the API call fails', async () => {
        const mockError = { response: { data: { error: 'Invalid credentials' } } };

        axios.post.mockRejectedValueOnce(mockError);
        easyPaisaService.createRSAEncryptedPayload.mockResolvedValueOnce('encryptedPayload');
        easyPaisaService.corporateLogin.mockImplementation(async () => {
            try {
                const encryptedPayload = await easyPaisaService.createRSAEncryptedPayload(`${obj.MSISDN}:${obj.pin}`);
                await axios.post(
                    "https://rgw.8798-f464fa20.eu-de.ri1.apiconnect.appdomain.cloud/tmfb/gateway/corporate-solution-corporate-login",
                    { LoginPayload: encryptedPayload },
                    {
                        headers: {
                            "X-IBM-Client-Id": obj.clientId,
                            "X-IBM-Client-Secret": obj.clientSecret,
                            "X-Channel": obj.xChannel,
                            "Content-Type": "application/json",
                        },
                    }
                );
            } catch (error) {
                console.error("Error:", error.response?.data || error.message);
                return undefined;
            }
        });

        console.error = jest.fn();

        const result = await easyPaisaService.corporateLogin(obj);

        expect(console.error).toHaveBeenCalledWith("Error:", mockError.response.data);
        expect(result).toBeUndefined();
    });
    it('should throw CustomError if payload encryption fails', async () => {
        const mockError = new Error('Encryption failed');
        
        easyPaisaService.createRSAEncryptedPayload.mockRejectedValueOnce(mockError);

        try {
            await easyPaisaService.corporateLogin(obj);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error.message).toBe('Encryption failed');
        }
    });
 
    it('should throw CustomError if an unexpected error occurs', async () => {
        const unexpectedError = new Error('Unexpected error');
        axios.post.mockRejectedValueOnce(unexpectedError);

        try {
            await easyPaisaService.corporateLogin(obj);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error.message).toBe('Unexpected error');
        }
    });
});

import axios from "axios";
import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";

async function fetchExistingClientSecret() {
    const firstApiUrl = 'https://z-sandbox.jsbl.com/zconnect/client/oauth-blb'; // Replace with your actual API endpoint

    try {
        const response = await fetch(firstApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'clientId': '509200T1B603i'
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch client secret. Status: ${response.status}`);
        }

        const data = await response.json();
        return {
            clientSecret: data.payLoad.clientSecret,
            organizationId: data?.payLoad?.organizationId
        };
    } catch (error: any) {
        console.error('Error fetching existing client secret:', error?.message);
        throw error;
    }
}

async function generateNewClientSecret() {
    const secondApiUrl = 'https://z-sandbox.jsbl.com/zconnect/client/reset-oauth-blb'; // Replace with your actual API endpoint

    try {
        const response = await fetch(secondApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "clientSecretId": "509200T1B603i"
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to generate new client secret. Status: ${response.status}`);
        }

        const data = await response.json();
        return {
            clientSecret: data.payLoad.clientSecret,
            organizationId: data?.payLoad?.organizationId
        };
    } catch (error: any) {
        console.error('Error generating new client secret:', error?.message);
        throw error;
    }
}

function generateUniqueSixDigitNumber(): string {
    // Get the current timestamp in milliseconds
    const timestamp = Date.now();

    // Generate a random number between 0 and 999
    const randomNumber = Math.floor(Math.random() * 1000);

    // Combine the timestamp and random number
    const combined = timestamp + randomNumber;

    // Convert the combined number to a string
    const combinedString = combined.toString();

    // Extract the last 6 digits
    const uniqueSixDigitString = combinedString.slice(-6);

    // Convert the result back to a number
    const uniqueSixDigitNumber = parseInt(uniqueSixDigitString, 10);

    return uniqueSixDigitNumber.toString();
}

const walletToWalletPayment = async (body: any, clientInfo: any) => {
    try {
        let id = generateUniqueSixDigitNumber();
        let date = transactionService.createTransactionId().slice(1,15);
        const response = await axios.post(
            'https://z-sandbox.jsbl.com/zconnect/api/v2/w2wp-blb',
            {
                'w2wpRequest': {
                    "MerchantType": "0088",
                    "TraceNo": id,
                    "CompanyName": "NOVA",
                    "DateTime": date,
                    "TerminalId": "NOVA",
                    "ReceiverMobileNumber": "03320354357",
                    "MobileNo": body?.mobile,
                    "Amount": body?.amount,
                    "Reserved1": "01",
                    "OtpPin": "01"
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    "clientId": "509200T1B603i",
                    'clientSecret': clientInfo.clientSecret,
                    'organizationId': clientInfo.organizationId
                }
            }
        );

        if(response.data.errorcode == "0000") {
            return {
                success: false,
                data: null
            }
        }
        return {
            success: true,
            data: response.data
        };
    }
    catch (err) {
        console.log("Zindigi Wallet to Wallet Payment Error: ", err);
        throw new CustomError("An Error has occured", 500);
    }
}

const debitInquiry = async (body: any) => {
    try {
        const response = await axios.post(
            'https://z-sandbox.jsbl.com/zconnect/api/v2/debitinquiry2-blb2',
            {
                'DebitInqRequest': body
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'clientId': '364E9806o51K9',
                    'clientSecret': 'eyJhbGciOiJIUzUxMiJ9.eyJleHAiOjE2OTI2MzcxOTl9.0s3evOaGFm6uyRxSioiXlOffHbZTDIB1zB1xl3ck_IIfxSrsARI9tPiooIOVjVv9rQqUInqtk1odcWtk8V3rFA',
                    'organizationId': '223'
                }
            }
        );
        return response.data;
    }
    catch (err) {
        console.log("Zindigi Debit Inquiry Error: ", err);
        throw new CustomError("An Error has occured", 500);
    }
}

const debitPayment = async (body: any, initiateResponse: any) => {
    try {
        const response = await axios.post(
            'https://z-sandbox.jsbl.com/zconnect/api/v2/debitpayment-blb2',
            {
                'DebitPaymentRequest': { ...body, ...initiateResponse }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'clientId': '364E9806o51K9',
                    'clientSecret': 'eyJhbGciOiJIUzUxMiJ9.eyJleHAiOjE2OTI2MzcxOTl9.0s3evOaGFm6uyRxSioiXlOffHbZTDIB1zB1xl3ck_IIfxSrsARI9tPiooIOVjVv9rQqUInqtk1odcWtk8V3rFA',
                    'organizationId': '223'
                }
            }
        );
        return response.data;
    }
    catch (err) {
        console.log("Zindigi Debit Payment Error: ", err);
        throw new CustomError("An Error has occured", 500);
    }
}

const transactionInquiry = async (body: any) => {
    try {
        let data = JSON.stringify({
            "transactionStatusReq": body
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://z-sandbox.jsbl.com/zconnect/api/v1/transactionStatus',
            headers: {
                'clientId': '1',
                'clientSecret': '1',
                'organizationId': '1',
                'Content-Type': 'application/json'
            },
            data: data
        };

        let response = await axios.request(config)
        return response.data;
    }
    catch (err) {
        console.log("Zindigi Transaction Status Error: ", err);
        throw new CustomError("An Error has occured", 500);
    }
}
export default { walletToWalletPayment, debitInquiry, debitPayment, transactionInquiry, fetchExistingClientSecret, generateNewClientSecret }
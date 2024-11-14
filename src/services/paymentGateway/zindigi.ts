import axios from "axios";
import CustomError from "utils/custom_error.js";

const walletToWalletPayment = async (body: any) => {
    try {
        const response = await axios.post(
            'https://z-sandbox.jsbl.com/zconnect/api/v2/w2wp-blb',
            {
                'w2wpRequest': body
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
export default { walletToWalletPayment, debitInquiry, debitPayment, transactionInquiry }
import axios from "axios";
import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import { IZindigiPayload } from "types/merchant.js";
import CustomError from "utils/custom_error.js";
import { decrypt, encrypt } from "utils/enc_dec.js";

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
        let date = transactionService.createTransactionId().slice(1, 15);
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

        if (response.data.errorcode == "0000") {
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

const createMerchant = async (merchantData: IZindigiPayload) => {
    try {
        if (!merchantData) {
            throw new CustomError("Merchant data is required", 400);
        }

        const zindigiMerchant = await prisma.$transaction(async (tx) => {
            return tx.zindigiMerchant.create({
                data: {
                    clientId: encrypt(merchantData.clientId),
                    clientSecret: encrypt(merchantData.clientSecret),
                    organizationId: encrypt(merchantData.organizationId)
                },
            });
        });

        if (!zindigiMerchant) {
            throw new CustomError(
                "An error occurred while creating the merchant",
                500
            );
        }
        return {
            message: "Merchant created successfully",
            data: zindigiMerchant,
        };
    } catch (error: any) {
        throw new CustomError(
            error?.message || "An error occurred while creating the merchant",
            500
        );
    }
};

const getMerchant = async (merchantId: string) => {
    try {
        const where: any = {};

        if (merchantId) {
            where["id"] = parseInt(merchantId);
        }

        let merchant = await prisma.zindigiMerchant.findMany({
            where: where,
            orderBy: {
                id: "desc",
            },
        });

        merchant = merchant.map((obj) => {
            obj["clientId"] = decrypt(obj["clientId"] as string);
            obj["clientSecret"] = decrypt(obj["clientSecret"] as string);
            obj["organizationId"] = decrypt(obj["organizationId"] as string);
            return obj;
        });

        if (!merchant) {
            throw new CustomError("Merchant not found", 404);
        }

        return {
            message: "Merchant retrieved successfully",
            data: merchant,
        };
    } catch (error: any) {
        throw new CustomError(
            error?.message || "An error occurred while reading the merchant",
            500
        );
    }
};

const updateMerchant = async (merchantId: string, updateData: IZindigiPayload) => {
    try {
        if (!merchantId) {
            throw new CustomError("Merchant ID is required", 400);
        }

        if (!updateData) {
            throw new CustomError("Update data is required", 400);
        }

        // Fetch existing data for the merchant
        const existingMerchant = await prisma.zindigiMerchant.findUnique({
            where: {
                id: parseInt(merchantId),
            },
        });

        if (!existingMerchant) {
            throw new Error("Merchant not found");
        }

        const updatedMerchant = await prisma.$transaction(async (tx) => {
            return tx.zindigiMerchant.update({
                where: {
                    id: parseInt(merchantId),
                },
                data: {
                    clientId:
                        updateData.clientId != undefined
                            ? encrypt(updateData.clientId)
                            : existingMerchant.clientId,
                    clientSecret:
                        updateData.clientSecret != undefined
                            ? encrypt(updateData.clientSecret)
                            : existingMerchant.clientSecret,
                    organizationId:
                        updateData.organizationId != undefined
                        ? encrypt(updateData.organizationId)
                        : existingMerchant.organizationId
                },
            });
        });

        if (!updatedMerchant) {
            throw new CustomError(
                "An error occurred while updating the merchant",
                500
            );
        }

        return {
            message: "Merchant updated successfully",
            data: updatedMerchant,
        };
    } catch (error: any) {
        console.log(error);
        throw new CustomError(
            error?.message || "An error occurred while updating the merchant",
            500
        );
    }
};

const deleteMerchant = async (merchantId: string) => {
    try {
        if (!merchantId) {
            throw new CustomError("Merchant ID is required", 400);
        }

        const deletedMerchant = await prisma.$transaction(async (tx) => {
            return tx.zindigiMerchant.delete({
                where: {
                    id: parseInt(merchantId),
                },
            });
        });

        if (!deletedMerchant) {
            throw new CustomError(
                "An error occurred while deleting the merchant",
                500
            );
        }

        return {
            message: "Merchant deleted successfully",
        };
    } catch (error: any) {
        throw new CustomError(
            error?.message || "An error occurred while deleting the merchant",
            500
        );
    }
};

export default { walletToWalletPayment, debitInquiry, debitPayment, transactionInquiry, fetchExistingClientSecret, generateNewClientSecret, createMerchant, getMerchant, updateMerchant, deleteMerchant }
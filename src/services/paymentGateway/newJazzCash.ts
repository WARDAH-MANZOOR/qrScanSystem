import { PROVIDERS } from "constants/providers.js";
import { format, toZonedTime } from "date-fns-tz";
import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";
import crypto from "crypto"
import axios from "axios";
import { addWeekdays } from "utils/date_method.js";
import { addDays } from "date-fns";
import { JsonObject } from "@prisma/client/runtime/library";

const getSecureHash = (data: any, salt: string): string => {
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

    // const sortedData = Object.keys(hashArray)
    //   .sort()
    //   .reduce((result: any, key: any) => {
    //     result[key] = hashArray[key];
    //     return result;
    //   }, {});
    const sortedData = Object.keys(data)
        .sort()
        .reduce((result: any, key: any) => {
            result[key] = data[key];
            return result;
        }, {});

    // Create the string to hash
    let strToHash = "";
    for (const key in sortedData) {
        const value = sortedData[key];
        if (value) {
            // Only include non-empty values
            strToHash += `&${value}`;
        }
    }

    // Prepend the integrity salt
    strToHash = salt + strToHash;

    // Generate the HMAC SHA256 hash
    const hmac = crypto.createHmac("sha256", salt);
    hmac.update(strToHash);
    const ppSecureHash = hmac.digest().toString("hex");

    return ppSecureHash;
};

interface RequestObject {
    [key: string]: string | null;
}

export function calculateHmacSha256(
    json: string,
    integrityText: string
): string | null {
    try {
        // Parse the JSON input
        const request: RequestObject = JSON.parse(json);
        console.log('Valid JSON');

        // Create a sorted list of the request object (excluding "pp_SecureHash")
        const sortedList: RequestObject = {};
        Object.keys(request).sort().forEach(key => {
            if (key !== "pp_SecureHash") {
                sortedList[key] = request[key];
            }
        });

        console.log(sortedList);

        // Build the final string by concatenating the values from sorted list and integrityText
        let finalString = integrityText + '&';
        Object.keys(sortedList).forEach(key => {
            finalString += sortedList[key] || ''; // Append the value of each key (skip null or undefined)
            if (sortedList[key] !== null && sortedList[key] !== "") {
                finalString += '&'; // Append '&' only if the value is not null or empty
            }
        });

        // Remove trailing '&'
        finalString = finalString.slice(0, -1);
        // console.log('Calculating Hash of "' + finalString + '"');

        // Calculate HMAC SHA256 hash using integrityText as the key
        const hmac256 = crypto.createHmac('sha256', integrityText)
            .update(finalString)
            .digest('hex')
            .toUpperCase();

        console.log(hmac256);

        // Return the calculated HMAC as output
        return hmac256;

    } catch (e: any) {
        console.error('Error: ' + e.message);
        return null;
    }
}
const newInitiateJazzCashPayment = async (
    paymentData: any,
    merchant_uid?: string
) => {
    let refNo: string = "";
    try {
        var JAZZ_CASH_MERCHANT_ID: any = null;
        // Get the current date
        const date2 = new Date();
        const date3 = new Date(Date.now() + (60 * 60 * 1000))

        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';

        // Convert the date to the Pakistan timezone
        const zonedDate = toZonedTime(date2, timeZone);
        const zonedDate2 = toZonedTime(date3, timeZone);


        // Format the date in the desired format
        const formattedDate = format(zonedDate, 'yyyyMMddHHmmss', { timeZone });

        const expiryDate = format(zonedDate2, 'yyyyMMddHHmmss', { timeZone })

        console.log(formattedDate); // Outputs date in "yyyyMMddHHmmss" format in PKT
        let jazzCashMerchantIntegritySalt = "";
        const jazzCashCredentials = {
            pp_MerchantID: "",
            pp_Password: "",
            pp_ReturnURL: "",
        };

        // Input Validation
        if (!paymentData.amount || !paymentData.phone) {
            throw new CustomError("Amount and phone are required", 400);
        }

        if (!paymentData.redirect_url) {
            throw new CustomError("Redirect URL is required", 400);
        }

        if (!paymentData.type) {
            throw new CustomError("Payment type is required", 400);
        }

        const phone = transactionService.convertPhoneNumber(paymentData.phone);

        const paymentType = paymentData.type?.toUpperCase();

        // Generate Transaction Reference Number
        const currentTime = Date.now();
        const fractionalMilliseconds = Math.floor(
            (currentTime - Math.floor(currentTime)) * 1000
        );
        let txnRefNo: string;
        let transactionCreated = false;

        // Start Prisma Transaction
        const result = await prisma.$transaction(async (tx) => {
            // Fetch Merchant and JazzCashMerchant within transaction
            let merchant;
            if (merchant_uid) {
                merchant = await tx.merchant.findFirst({
                    where: {
                        uid: merchant_uid,
                    },
                    include: {
                        commissions: true,
                    },
                });

                if (!merchant) {
                    throw new CustomError("Merchant not found", 404);
                }

                const jazzCashMerchant = await tx.jazzCashMerchant.findFirst({
                    where: {
                        id: merchant.jazzCashMerchantId as number,
                    },
                });

                if (!jazzCashMerchant) {
                    throw new CustomError("Payment Merchant not found", 404);
                }
                // const wallet = processTransaction(merchant, paymentData.amount, "jazzcash");
                // Update JazzCash Credentials
                jazzCashCredentials.pp_MerchantID = jazzCashMerchant.jazzMerchantId;
                jazzCashCredentials.pp_Password = jazzCashMerchant.password;
                jazzCashMerchantIntegritySalt = jazzCashMerchant.integritySalt;
                jazzCashCredentials.pp_ReturnURL = jazzCashMerchant.returnUrl;
                JAZZ_CASH_MERCHANT_ID = jazzCashMerchant.id;

                paymentData.merchantId = merchant.merchant_id;
            } else {
                throw new CustomError("Merchant UID is required", 400);
            }

            let data: { transaction_id?: string, merchant_transaction_id?: string; } = {};

            // Transaction Reference Number
            if (paymentData.transaction_id) {
                const transactionExists = await tx.transaction.findUnique({
                    where: {
                        transaction_id: paymentData.transaction_id,
                        status: "pending",
                    },
                });
                if (transactionExists) {
                    txnRefNo = paymentData.transaction_id;
                    transactionCreated = true;
                } else {
                    throw new CustomError(
                        "Transaction with Transaction ID not found",
                        404
                    );
                }
            } else {
                txnRefNo = `T${formattedDate}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`;

                // if (paymentData.order_id) {
                //   data["transaction_id"] = paymentData.order_id;
                // }
                // else {
                //   data["transaction_id"] = txnRefNo;
                // }
                if (paymentData.order_id) {
                    data["merchant_transaction_id"] = paymentData.order_id;
                }
                else {
                    data["merchant_transaction_id"] = txnRefNo;
                }
                data["transaction_id"] = txnRefNo;
                // else {
                const settled_amount = parseFloat(paymentData.amount) * ((1 - (+merchant.commissions[0].commissionRate + +merchant.commissions[0].commissionGST + +merchant.commissions[0].commissionWithHoldingTax)) as unknown as number)
                // Create Transaction within the transaction
                try {
                    await tx.transaction.create({
                        data: {
                            ...data,
                            date_time: new Date(),
                            original_amount: paymentData.amount,
                            type: paymentData.type.toLowerCase(),
                            status: "pending",
                            merchant_id: merchant.merchant_id,
                            settled_amount,
                            balance: settled_amount,
                            providerDetails: {
                                id: JAZZ_CASH_MERCHANT_ID,
                                name: PROVIDERS.JAZZ_CASH,
                                msisdn: phone,
                            },
                        },
                    });
                    transactionCreated = true;
                }
                catch (err) {
                    throw new CustomError("Transaction not Created", 400)
                }
            }
            console.log("Data: ", data);
            // Return necessary data for further processing
            return {
                merchant,
                integritySalt: jazzCashMerchantIntegritySalt,
                refNo: data.merchant_transaction_id as string,
                txnRefNo: data.transaction_id as string
            };
        }, {
            maxWait: 5000,
            timeout: 20000
        }); // End of Prisma Transaction

        // Prepare Data for JazzCash
        const { merchant, integritySalt } = result;
        refNo = result.refNo;
        txnRefNo = result.txnRefNo;
        console.log("Ref No: ", refNo)
        jazzCashMerchantIntegritySalt = integritySalt;
        const amount = paymentData.amount;

        const date = format(
            new Date(Date.now() + 60 * 60 * 1000),
            "yyyyMMddHHmmss"
        );
        const sendData: any = {
            pp_Version: "1.1",
            pp_TxnType: "MWALLET",
            pp_Language: "EN",
            pp_MerchantID: jazzCashCredentials.pp_MerchantID,
            pp_SubMerchantID: "",
            pp_Password: jazzCashCredentials.pp_Password,
            pp_TxnRefNo: refNo,
            pp_Amount: amount * 100,
            pp_DiscountedAmount: "",
            pp_TxnCurrency: "PKR",
            pp_TxnDateTime: formattedDate,
            pp_BillReference: "billRef",
            pp_Description: "buy",
            pp_TxnExpiryDateTime: expiryDate, // +1 hour
            pp_ReturnURL: jazzCashCredentials.pp_ReturnURL,
            ppmpf_1: phone,
            ppmpf_2: "",
            ppmpf_3: "",
            ppmpf_4: "",
            ppmpf_5: "",
        };
        // Generate the secure hash
        sendData.pp_SecureHash = getSecureHash(
            sendData,
            jazzCashMerchantIntegritySalt
        );

        if (paymentType === "CARD") {
            // Handle CARD payment type
            const payload: any = {
                pp_CustomerID: "25352",
                pp_CustomerEmail: "abc@abc.com",
                pp_CustomerMobile: "03022082257",
                pp_Version: "1.1",
                pp_TxnType: "MPAY",
                pp_TxnRefNo: "T202411111011302",
                pp_MerchantID: "12478544",
                pp_Password: "uczu5269d1",
                pp_Amount: "100",
                pp_TxnCurrency: "PKR",
                pp_TxnDateTime: format(new Date(), "yyyyMMddHHmmss"),
                pp_TxnExpiryDateTime: format(new Date(Date.now() + 60 * 60 * 1000), "yyyyMMddHHmmss"),
                pp_BillReference: "billRef",
                pp_Description: "Description of transaction",
                pp_CustomerCardNumber: "5123450000000008",
                pp_CustomerCardCVV: "100",
                pp_CustomerCardExpiry: "01/39",
                // pp_SecureHash: "",
                // pp_DiscountedAmount: "",
                // pp_DiscountBank: "",
                pp_ReturnURL: "https://devtects.com/thankyou.html",
                pp_UsageMode: "API"
            };

            let salt = "e6t384f1fu";

            payload.pp_SecureHash = calculateHmacSha256(JSON.stringify(payload), salt);
            console.log("🚀 ~ payload.pp_SecureHash:", payload.pp_SecureHash)



            const paymentUrl = "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Purchase/PAY";
            const headers = {
                "Content-Type": "application/json",
            };

            console.log("🚀 ~ payload:", payload);


            const response = await axios.post(paymentUrl, payload, { headers });

            const r = response.data;
            console.log(r);


            return r


            // You can process CARD payments similarly
            // jazzCashCardPayment({
            //   refNo: refNo,
            //   secureHash: sendData.pp_SecureHash,
            //   amount: amount,
            //   txnDateTime: txnDateTime,
            //   jazzCashMerchantIntegritySalt: jazzCashMerchantIntegritySalt,
            //   ...jazzCashCredentials,
            // });
        } else if (paymentType === "WALLET") {
            // Send the request to JazzCash
            const paymentUrl =
                "https://pgw.jazzcash.com.pk/api/payment/DoTransaction";
            // "https://payments.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction"
            const headers = {
                "Content-Type": "application/x-www-form-urlencoded",
            };

            const response = await axios.post(
                paymentUrl,
                new URLSearchParams(sendData).toString(),
                { headers }
            );

            const r = response.data;
            console.log(r);
            if (!r) {
                throw new CustomError(response.statusText, 500);
            }

            let status = "completed";
            if (r.pp_ResponseCode !== "000") {
                status = "failed";
            }
            r.pp_ResponseMessage = r.pp_ResponseMessage == "Transaction is Pending" ? "User did not respond" : r.pp_ResponseMessage
            // Update Transaction after receiving response
            await prisma.$transaction(async (tx) => {
                if (
                    status != "completed" &&
                    status != "pending" &&
                    status != "failed"
                ) {
                    return;
                }
                console.log("Ref No: ", refNo)
                // Update transaction status
                let transaction = await tx.transaction.update({
                    where: {
                        merchant_transaction_id: refNo,
                    },
                    data: {
                        status,
                        response_message: r.pp_ResponseMessage,
                        providerDetails: {
                            id: JAZZ_CASH_MERCHANT_ID,
                            name: PROVIDERS.JAZZ_CASH,
                            msisdn: phone,
                            transactionId: r.pp_RetrievalReferenceNo
                        },
                        // Update other necessary fields
                    },
                });

                // Create AdditionalInfo record
                // await tx.additionalInfo.create({
                //   data: {
                //     bank_id: r.pp_BankID,
                //     bill_reference: r.pp_BillReference,
                //     retrieval_ref: r.pp_RetrievalReferenceNo,
                //     sub_merchant_id: r.pp_SubMerchantID
                //       ? encrypt(r.pp_SubMerchantID)
                //       : "",
                //     custom_field_1: encrypt(r.ppmpf_1),
                //     // Add other fields as necessary
                //     transaction: {
                //       connect: { transaction_id: refNo },
                //     },
                //   },
                // });

                // Update Provider info if necessary
                const provider = await tx.provider.upsert({
                    where: {
                        name_txn_type_version: {
                            name: "JazzCash",
                            txn_type: "MWALLET",
                            version: "1.1",
                        },
                    },
                    update: {},
                    create: {
                        name: "JazzCash",
                        txn_type: "MWALLET",
                        version: "1.1",
                    },
                });

                // Update transaction with providerId
                await tx.transaction.update({
                    where: {
                        merchant_transaction_id: refNo,
                    },
                    data: {
                        providerId: provider.id,
                    },
                });
                if (status == "completed") {
                    const scheduledAt = addWeekdays(
                        new Date(),
                        merchant.commissions[0].settlementDuration as number
                    ); // Call the function to get the next 2 weekdays
                    const transaction2 = await prisma.scheduledTask.findUnique({
                        where: {
                            transactionId: txnRefNo
                        }
                    })
                    if (!transaction2) {
                        let scheduledTask = await prisma.scheduledTask.create({
                            data: {
                                transactionId: txnRefNo,
                                status: "pending",
                                scheduledAt: scheduledAt, // Assign the calculated weekday date
                                executedAt: null, // Assume executedAt is null when scheduling
                            },
                        });
                    }
                    transactionService.sendCallback(
                        merchant?.webhook_url as string,
                        transaction,
                        phone,
                        "payin",
                        merchant.encrypted == "True" ? true : false,
                        false
                    );
                }
            }, {
                timeout: 60000,
                maxWait: 60000
            });
            // End of transaction

            console.log(r.pp_ResponseCode);
            if (r.pp_ResponseCode === "000") {
                // return {
                //     message: "Redirecting to JazzCash...",
                //     redirect_url: paymentData.redirect_url,
                //     txnNo: r.pp_TxnRefNo,
                //     txnDateTime: r.pp_TxnDateTime,
                //     statusCode: r.pp_ResponseCode
                // };
                return { request: sendData, response: r, statusCode: 200 }
            } else {
                return { request: sendData, response: r, statusCode: 500 }
                // throw new CustomError(
                //     `The payment failed because: 【${r.pp_ResponseCode} ${r.pp_ResponseMessage}】`,
                //     500
                // );
            }
        }
    } catch (error: any) {
        console.log("🚀 ~ error:", error)
        return {
            message: error?.message || "An Error Occured",
            statusCode: error?.statusCode || 500,
            txnNo: refNo
        }
    }
};

const newInitiateJazzCashCnicPayment = async (
    paymentData: any,
    merchant_uid?: string
) => {
    let refNo: string = "";
    try {
        // Timezone and Date Formatting
        const currentTime = new Date();
        const expiryTime = addDays(currentTime, 1);

        const formattedDate = format(currentTime, "yyyyMMddHHmmss");
        const expiryDate = format(expiryTime, "yyyyMMddHHmmss");

        // Input Validation
        if (!paymentData.amount || !paymentData.phone || !paymentData.cnic) {
            throw new CustomError("Amount, phone, and CNIC are required", 400);
        }
        const time = Date.now();
        const fractionalMilliseconds = Math.floor(
            (time - Math.floor(time)) * 1000
        )
        // Generate Transaction Reference Number
        // const txnRefNo = `T${formattedDate}${Math.floor(Math.random() * 10000)}`;
        const txnRefNo = `T${formattedDate}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`;
        let data2: { transaction_id?: string; merchant_transaction_id?: string; } = {};
        if (paymentData.order_id) {
            data2['merchant_transaction_id'] = paymentData.order_id;
        }
        else {
            data2['merchant_transaction_id'] = txnRefNo;
        }
        data2['transaction_id'] = txnRefNo;
        let merchant: any;
        // Start Prisma Transaction
        const result = await prisma.$transaction(async (tx) => {
            merchant = await tx.merchant.findFirst({
                where: { uid: merchant_uid },
                include: { commissions: true },
            });
            if (!merchant) throw new CustomError("Merchant not found", 404);

            const jazzCashMerchant = await tx.jazzCashMerchant.findFirst({
                where: { id: merchant.jazzCashMerchantId as number },
            });
            if (!jazzCashMerchant) throw new CustomError("Payment Merchant not found", 404);

            const settled_amount =
                parseFloat(paymentData.amount) *
                (1 -
                    (+merchant.commissions[0].commissionRate +
                        +merchant.commissions[0].commissionGST +
                        +merchant.commissions[0].commissionWithHoldingTax));

            await tx.transaction.create({
                data: {
                    ...data2,
                    date_time: new Date(),
                    original_amount: paymentData.amount,
                    type: "wallet",
                    status: "pending",
                    merchant_id: merchant.merchant_id,
                    settled_amount,
                    balance: settled_amount,
                    providerDetails: {
                        id: jazzCashMerchant.id,
                        name: PROVIDERS.JAZZ_CASH,
                        msisdn: paymentData.phone,
                    }
                },
            });

            return {
                merchant,
                jazzCashMerchant,
                txnRefNo,
            };
        }, {
            timeout: 60000,
            maxWait: 60000
        });

        // Prepare Payload for JazzCash Wallet API
        const { jazzCashMerchant } = result;
        const payload = {
            pp_Language: "EN",
            pp_MerchantID: jazzCashMerchant.jazzMerchantId,
            pp_Password: jazzCashMerchant.password,
            pp_TxnRefNo: data2["merchant_transaction_id"],
            pp_Amount: String(paymentData.amount * 100),
            pp_TxnCurrency: "PKR",
            pp_TxnDateTime: formattedDate,
            pp_TxnExpiryDateTime: expiryDate,
            pp_BillReference: "billRef123",
            pp_Description: "Payment via JazzCash Wallet",
            pp_CNIC: paymentData.cnic.slice(-6),
            pp_MobileNumber: paymentData.phone,
            pp_SecureHash: '',
            ppmpf_1: '',
            ppmpf_2: '',
            ppmpf_3: '',
            ppmpf_4: '',
            ppmpf_5: '',
        };

        // Generate Secure Hash
        const secureHash = getSecureHash(payload, jazzCashMerchant.integritySalt);
        console.log(secureHash);
        payload.pp_SecureHash = secureHash;

        // Send Request to JazzCash Wallet API
        const headers = { "Content-Type": "application/json" };
        let part = "";
        if (paymentData.use_sandbox == 'yes') {
            part = "https://sandbox.jazzcash.com.pk/";
        }
        else {
            part = "https://pgw.jazzcash.com.pk/"
            // "https://payments.jazzcash.com.pk/"
        }
        // const apiUrl = `${part}ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction`;
        const apiUrl = `${part}api/2.0/purchase/domwallettransaction`
        console.log(apiUrl);
        const response = await axios.post(apiUrl, payload, { headers });
        const data = response.data;

        // Handle Response and Update Transaction
        const status = data.pp_ResponseCode === "000" ? "completed" : "failed";
        const transaction = await prisma.transaction.update({
            where: { transaction_id: txnRefNo },
            data: {
                status,
                response_message: data.pp_ResponseMessage,
                providerDetails: {
                    id: jazzCashMerchant.id,
                    name: PROVIDERS.JAZZ_CASH,
                    msisdn: paymentData.phone,
                    transactionId: data.pp_RetrievalReferenceNo
                }
            },
        });
        if (status == "completed") {
            const scheduledAt = addWeekdays(
                new Date(),
                merchant.commissions[0].settlementDuration as number
            ); // Call the function to get the next 2 weekdays
            const transaction2 = await prisma.scheduledTask.findUnique({
                where: {
                    transactionId: txnRefNo
                }
            })
            if (!transaction2) {
                let scheduledTask = await prisma.scheduledTask.create({
                    data: {
                        transactionId: txnRefNo,
                        status: "pending",
                        scheduledAt: scheduledAt, // Assign the calculated weekday date
                        executedAt: null, // Assume executedAt is null when scheduling
                    },
                });
            }
            transactionService.sendCallback(
                merchant?.webhook_url as string,
                transaction,
                paymentData.phone,
                "payin",
                merchant.encrypted == "True" ? true : false,
                false
            );
        }
        console.log(data);
        return {
            request: payload,
            response: data,
            statusCode: data.pp_ResponseCode == "000" ? 200 : 500,
        }
        // return {
        //     message: data.pp_ResponseMessage,
        //     statusCode: data.pp_ResponseCode == "000" ? 200 : 201,
        //     txnRefNo,
        // };
    } catch (error: any) {
        console.error("🚀 ~ Error:", error);
        return {
            message: error.message || "An Error Occurred",
            statusCode: error.statusCode || 500,
            txnRefNo: refNo,
        };
    }
};

const newStatusInquiry = async (payload: any, merchantId: string) => {
    let merchant = await prisma.merchant.findFirst({
        where: { uid: merchantId },
        include: {
            jazzCashMerchant: true,
        },
    });

    if (!merchant) {
        throw new CustomError("Merchant Not Found", 400);
    }

    const txn = await prisma.transaction.findFirst({
        where: {
            merchant_transaction_id: payload.transactionId,
            merchant_id: merchant?.merchant_id,
            providerDetails: {
                path: ['name'],
                equals: PROVIDERS.JAZZ_CASH
            }
        }
    })

    if (!txn) {
        console.log("Transaction");
        throw new CustomError("Transaction Not Found", 400)
    }
    let sendData = {
        pp_TxnRefNo: payload.transactionId,
        pp_MerchantID: merchant?.jazzCashMerchant?.jazzMerchantId,
        pp_Password: merchant?.jazzCashMerchant?.password,
        pp_SecureHash: "",
    };
    console.log(sendData)
    sendData.pp_SecureHash = getSecureHash(
        sendData,
        merchant?.jazzCashMerchant?.integritySalt as string
    );
    let data = JSON.stringify(sendData);

    let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://pgw.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire",
        headers: {
            "Content-Type": "application/json",
        },
        data: data,
    };

    let res = await axios.request(config);
    console.log("Response: ", res.data)
    if (res.data.pp_ResponseCode == "000") {
        return { request: data, response: res.data, statusCode: 200 }
        //   delete res.data.pp_SecureHash;
        //   return {
        //     "orderId": payload.transactionId,
        //     "transactionStatus": res.data.pp_Status,
        //     "transactionAmount": txn?.original_amount,
        //     "transactionDateTime": txn?.date_time,
        //     "msisdn": (txn?.providerDetails as JsonObject)?.msisdn,
        //     "responseDesc": res.data.pp_PaymentResponseMessage,
        //     "responseMode": "MA"
        //   }
        // return res.data;
    } else {
        return { request: data, response: res.data, statusCode: 500 }

        //   return {
        //     message: "Transaction Not Found",
        //     statusCode: 500
        //   }
    }
};

export default {
    newInitiateJazzCashPayment,
    newInitiateJazzCashCnicPayment,
    newStatusInquiry
}
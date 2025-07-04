import { PROVIDERS } from "constants/providers.js";
import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";
const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});
const getApiToken = async (merchantId, params) => {
    let findMerchant = await prisma.merchant.findFirst({
        where: {
            uid: merchantId
        },
        include: {
            commissions: true
        }
    });
    if (!findMerchant || !findMerchant.payFastMerchantId) {
        throw new CustomError("Merchant Not Found", 500);
    }
    const payFastMerchant = await prisma.payFastMerchant.findFirst({
        where: {
            id: findMerchant.payFastMerchantId
        }
    });
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");
    urlencoded.append("secured_key", `${payFastMerchant?.securedKey}`);
    urlencoded.append("merchant_id", `${payFastMerchant?.merchantId}`);
    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: urlencoded,
        redirect: "follow"
    };
    console.log("Request: ", requestOptions);
    let result = await fetch("https://apipxy.apps.net.pk:8443/api/token", requestOptions)
        .then((response) => response.text())
        .then((result) => result)
        .catch((error) => error);
    console.log("Result: ", result);
    return result;
};
const validateCustomerInformation = async (merchantId, params) => {
    const myHeaders = new Headers();
    const phone = transactionService.convertPhoneNumber(params.phone);
    let id = transactionService.createTransactionId();
    let id2 = params.order_id || id;
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    myHeaders.append("Authorization", `Bearer ${params.token}`);
    const urlencoded = new URLSearchParams();
    const otp = JSON.stringify(Math.floor(100000 + Math.random() * 900000));
    urlencoded.append("basket_id", id2);
    urlencoded.append("txnamt", params.amount);
    urlencoded.append("customer_mobile_no", "03453076714");
    urlencoded.append("customer_email_address", params.email);
    urlencoded.append("account_type_id", "4");
    urlencoded.append("bank_code", params.bankCode);
    urlencoded.append("order_date", formatter.format(new Date()));
    urlencoded.append("account_number", phone);
    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: urlencoded,
        redirect: "follow"
    };
    let result = await fetch("https://apipxy.apps.net.pk:8443/api/customer/validate", requestOptions)
        .then((response) => response.json())
        .then((result) => result)
        .catch((error) => error);
    console.log("Result: ", { ...result, otp });
    return { ...result, otp };
};
const validateCustomerInformationForCnic = async (merchantId, params) => {
    let saveTxn;
    try {
        console.log(JSON.stringify({ event: "PAYFAST_CNIC_VALIDATION_REQUEST", order_id: params.order_id, body: params }));
        let findMerchant = await prisma.merchant.findFirst({
            where: {
                uid: merchantId
            },
            include: {
                commissions: true
            }
        });
        if (!findMerchant) {
            throw new CustomError("Merchant Not Found", 500);
        }
        const myHeaders = new Headers();
        const phone = transactionService.convertPhoneNumber(params.phone);
        let id = transactionService.createTransactionId();
        let id2 = params.order_id || id;
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
        myHeaders.append("Authorization", `Bearer ${params.token}`);
        const urlencoded = new URLSearchParams();
        const otp = JSON.stringify(Math.floor(100000 + Math.random() * 900000));
        urlencoded.append("basket_id", id2);
        urlencoded.append("txnamt", params.amount);
        urlencoded.append("customer_mobile_no", "03453076714");
        urlencoded.append("customer_email_address", params.email);
        urlencoded.append("account_type_id", "4");
        urlencoded.append("bank_code", params.bankCode);
        urlencoded.append("order_date", formatter.format(new Date()));
        urlencoded.append("account_number", phone);
        // if (params.cnic) {
        urlencoded.append('cnic_number', params.cnic);
        // urlencoded.append('otp', otp)
        // }
        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: urlencoded,
            redirect: "follow"
        };
        let commission;
        commission = +findMerchant.commissions[0].commissionGST +
            +findMerchant.commissions[0].commissionRate +
            +findMerchant.commissions[0].commissionWithHoldingTax;
        console.log(id2);
        saveTxn = await transactionService.createTxn({
            order_id: id2,
            transaction_id: id,
            amount: params.amount,
            status: "pending",
            type: params.type,
            merchant_id: findMerchant.merchant_id,
            commission,
            settlementDuration: findMerchant.commissions[0].settlementDuration,
            providerDetails: {
                id: findMerchant.payFastMerchantId,
                name: params.bankCode == '14' ? PROVIDERS.UPAISA : PROVIDERS.ZINDIGI,
                msisdn: phone,
                cnic: params?.cnic
            },
        });
        let result = await fetch("https://apipxy.apps.net.pk:8443/api/customer/validate", requestOptions)
            .then((response) => response.json())
            .then((result) => result)
            .catch((error) => error);
        console.log("Result: ", { ...result, otp });
        if (result?.code != "00") {
            transactionService.updateTxn(saveTxn.transaction_id, {
                status: "failed",
                response_message: result.message,
                providerDetails: {
                    id: findMerchant.payFastMerchantId,
                    name: params.bankCode == '14' ? PROVIDERS.UPAISA : PROVIDERS.ZINDIGI,
                    msisdn: phone,
                    cnic: params?.cnic,
                    sub_name: PROVIDERS.PAYFAST
                }
            }, findMerchant.commissions[0].settlementDuration);
            return {
                response_message: result.message || "An error occurred while initiating the transaction",
                statusCode: 500,
                txnNo: saveTxn?.merchant_transaction_id
            };
        }
        console.log(JSON.stringify({
            event: "PAYFAST_CNIC_VALIDATION_RESPONSE", order_id: params.order_id, response: {
                txnNo: saveTxn?.merchant_transaction_id,
                txnDateTime: saveTxn?.date_time,
                statusCode: result?.status_code,
                transaction_id: result.transaction_id,
                response_message: result?.message
            }
        }));
        return {
            txnNo: saveTxn?.merchant_transaction_id,
            txnDateTime: saveTxn?.date_time,
            statusCode: result?.status_code,
            transaction_id: result.transaction_id,
            response_message: result?.message
        };
        ;
    }
    catch (err) {
        console.log(err);
        console.log(JSON.stringify({
            event: "PAYFAST_PAYIN_CNIC_VALIDATION_ERROR", order_id: params.order_id, error: {
                message: err?.message || "An error occurred while initiating the transaction",
                statusCode: err?.statusCode || 500,
                txnNo: saveTxn?.merchant_transaction_id
            }
        }));
        return {
            message: err?.message || "An error occurred while initiating the transaction",
            statusCode: err?.statusCode || 500,
            txnNo: saveTxn?.merchant_transaction_id
        };
    }
};
const pay = async (merchantId, params) => {
    let saveTxn;
    try {
        let id = transactionService.createTransactionId();
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_INITIATED", order_id: params.order_id, system_order_id: id }));
        let findMerchant = await prisma.merchant.findFirst({
            where: {
                uid: merchantId
            },
            include: {
                commissions: true
            }
        });
        if (!findMerchant) {
            throw new CustomError("Merchant Not Found", 500);
        }
        const phone = transactionService.convertPhoneNumber(params.phone);
        let id2 = params.order_id || id;
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
        myHeaders.append("Authorization", `Bearer ${params.token}`);
        const urlencoded = new URLSearchParams();
        urlencoded.append("basket_id", id2);
        urlencoded.append("txnamt", params.amount);
        urlencoded.append("customer_email_address", params.email);
        urlencoded.append("account_type_id", "4");
        urlencoded.append("customer_mobile_no", "03453076786");
        urlencoded.append("account_number", params.phone);
        urlencoded.append("bank_code", params.bankCode);
        urlencoded.append("order_date", formatter.format(new Date()));
        urlencoded.append("transaction_id", params.transaction_id);
        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: urlencoded,
            redirect: "follow"
        };
        // Save transaction immediately with "pending" status
        let commission;
        if (findMerchant.commissions[0].commissionMode == "SINGLE") {
            commission = +findMerchant.commissions[0].commissionGST +
                +findMerchant.commissions[0].commissionRate +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        else {
            commission = +findMerchant.commissions[0].commissionGST +
                +(findMerchant.commissions[0]?.easypaisaRate ?? 0) +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        saveTxn = await transactionService.createTxn({
            order_id: id2,
            transaction_id: id,
            amount: params.amount,
            status: "pending",
            type: params.type,
            merchant_id: findMerchant.merchant_id,
            commission,
            settlementDuration: findMerchant.commissions[0].settlementDuration,
            providerDetails: {
                id: findMerchant.payFastMerchantId,
                name: PROVIDERS.EASYPAISA,
                msisdn: phone
            },
        });
        console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", order_id: params.order_id, system_order_id: id }));
        let result = await fetch("https://apipxy.apps.net.pk:8443/api/transaction", requestOptions)
            .then((response) => response.json())
            .then((result) => result)
            .catch((error) => error);
        if (result.status_code == "00") {
            console.log(JSON.stringify({ event: "PAYFAST_PAYIN_SUCCESS", order_id: params.order_id, system_order_id: id, response: result }));
            const updateTxn = await transactionService.updateTxn(saveTxn.transaction_id, {
                status: "completed",
                response_message: result.message,
                providerDetails: {
                    id: findMerchant.payFastMerchantId,
                    name: PROVIDERS.EASYPAISA,
                    msisdn: phone,
                    transactionId: result?.transaction_id,
                    sub_name: PROVIDERS.PAYFAST
                }
            }, findMerchant.commissions[0].settlementDuration);
            transactionService.sendCallback(findMerchant.webhook_url, saveTxn, phone, "payin", findMerchant.encrypted == "True" ? true : false, true);
            return {
                txnNo: saveTxn.merchant_transaction_id,
                txnDateTime: saveTxn.date_time,
                statusCode: "0000"
            };
        }
        else {
            console.log(JSON.stringify({ event: "PAYFAST_PAYIN_FAILED", order_id: params.order_id, system_order_id: id, response: result }));
            const updateTxn = await transactionService.updateTxn(saveTxn.transaction_id, {
                status: "failed",
                response_message: result.message,
                providerDetails: {
                    id: findMerchant.payFastMerchantId,
                    name: PROVIDERS.EASYPAISA,
                    msisdn: phone,
                    transactionId: result?.transaction_id,
                    sub_name: PROVIDERS.PAYFAST
                }
            }, findMerchant.commissions[0].settlementDuration);
            throw new CustomError(result?.status_msg, 500);
        }
    }
    catch (err) {
        console.log(JSON.stringify({
            event: "PAYFAST_PAYIN_ERROR", order_id: params.order_id, error: {
                message: err?.message || "An error occurred while initiating the transaction",
                statusCode: err?.statusCode || 500,
                txnNo: saveTxn?.merchant_transaction_id
            }
        }));
        return {
            message: err?.message || "An error occurred while initiating the transaction",
            statusCode: err?.statusCode || 500,
            txnNo: saveTxn?.merchant_transaction_id
        };
    }
};
const payAsync = async (merchantId, params) => {
    let saveTxn;
    let id = transactionService.createTransactionId();
    try {
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_INITIATED", order_id: params.order_id, system_order_id: id }));
        const findMerchant = await prisma.merchant.findFirst({
            where: {
                uid: merchantId,
            },
            include: {
                commissions: true,
            },
        });
        if (!findMerchant || !findMerchant.payFastMerchantId) {
            throw new CustomError("Merchant not found", 404);
        }
        const phone = transactionService.convertPhoneNumber(params.phone);
        let id2 = params.order_id || id;
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
        myHeaders.append("Authorization", `Bearer ${params.token}`);
        const urlencoded = new URLSearchParams();
        urlencoded.append("basket_id", id2);
        urlencoded.append("txnamt", params.amount);
        urlencoded.append("customer_email_address", params.email);
        urlencoded.append("account_type_id", "4");
        urlencoded.append("customer_mobile_no", "03453076786");
        urlencoded.append("account_number", params.phone);
        urlencoded.append("bank_code", params.bankCode);
        urlencoded.append("order_date", formatter.format(new Date()));
        urlencoded.append("transaction_id", params.transaction_id);
        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: urlencoded,
            redirect: "follow"
        };
        // Save transaction immediately with "pending" status
        let commission;
        if (findMerchant.commissions[0].commissionMode == "SINGLE") {
            commission = +findMerchant.commissions[0].commissionGST +
                +findMerchant.commissions[0].commissionRate +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        else {
            commission = +findMerchant.commissions[0].commissionGST +
                +(findMerchant.commissions[0]?.easypaisaRate ?? 0) +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        saveTxn = await transactionService.createTxn({
            order_id: id2,
            transaction_id: id,
            amount: params.amount,
            status: "pending",
            type: params.type,
            merchant_id: findMerchant.merchant_id,
            commission,
            settlementDuration: findMerchant.commissions[0].settlementDuration,
            providerDetails: {
                id: findMerchant.payFastMerchantId,
                name: PROVIDERS.EASYPAISA,
                msisdn: phone,
            },
        });
        console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", system_id: id, order_id: params.order_id }));
        // Return pending status and transaction ID immediately
        setImmediate(async () => {
            try {
                let result = await fetch("https://apipxy.apps.net.pk:8443/api/transaction", requestOptions)
                    .then((response) => response.json())
                    .then((result) => result)
                    .catch((error) => error);
                if (result.status_code === "00") {
                    console.log(JSON.stringify({ event: "PAYFAST_ASYNC_SUCCESS", order_id: params.order_id, system_id: id, response: result }));
                    await transactionService.updateTxn(saveTxn?.transaction_id, {
                        status: "completed",
                        response_message: result.message,
                        providerDetails: {
                            id: findMerchant.payFastMerchantId,
                            name: PROVIDERS.EASYPAISA,
                            msisdn: phone,
                            transactionId: result?.transaction_id,
                            sub_name: PROVIDERS.PAYFAST
                        },
                    }, findMerchant.commissions[0].settlementDuration);
                    transactionService.sendCallback(findMerchant.webhook_url, saveTxn, phone, "payin", findMerchant?.encrypted?.toLowerCase() == "true" ? true : false, true);
                }
                else {
                    console.log("Response: ", result);
                    console.log(JSON.stringify({ event: "PAYFAST_ASYNC_FAILED", order_id: params.order_id, system_id: id, response: result }));
                    await transactionService.updateTxn(saveTxn?.transaction_id, {
                        status: "failed",
                        response_message: result.message,
                        providerDetails: {
                            id: findMerchant.payFastMerchantId,
                            name: PROVIDERS.EASYPAISA,
                            msisdn: phone,
                            transactionId: result?.transaction_id,
                            sub_name: PROVIDERS.PAYFAST
                        },
                    }, findMerchant.commissions[0].settlementDuration);
                }
            }
            catch (error) {
                console.log(JSON.stringify({
                    event: "EASYPAISA_PAYIN_ERROR", order_id: params.order_id, system_id: id, error: {
                        message: error?.message,
                        response: error?.response?.data || null,
                        statusCode: error?.statusCode || error?.response?.status || null,
                    }
                }));
                await transactionService.updateTxn(saveTxn?.transaction_id, {
                    status: "failed",
                    response_message: error.message,
                    providerDetails: {
                        id: findMerchant.payFastMerchantId,
                        name: PROVIDERS.EASYPAISA,
                        msisdn: phone,
                        transactionId: params?.transaction_id,
                        sub_name: PROVIDERS.PAYFAST
                    },
                }, findMerchant.commissions[0].settlementDuration);
            }
        });
        return {
            txnNo: saveTxn.merchant_transaction_id,
            txnDateTime: saveTxn.date_time,
            statusCode: "pending",
        };
    }
    catch (error) {
        console.log(JSON.stringify({
            event: "PAYFAST_ASYNC_ERROR", order_id: params.order_id, error: {
                message: error?.message || "An error occurred while initiating the transaction",
                statusCode: error?.statusCode || 500,
                txnNo: saveTxn?.merchant_transaction_id
            }
        }));
        return {
            message: error?.message || "An error occurred while initiating the transaction",
            statusCode: error?.statusCode || 500,
            txnNo: saveTxn?.merchant_transaction_id || null,
        };
    }
};
const payAsyncClone = async (merchantId, params) => {
    let saveTxn;
    let id = transactionService.createTransactionId();
    try {
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_INITIATED", order_id: params.order_id, system_order_id: id }));
        const findMerchant = await prisma.merchant.findFirst({
            where: {
                uid: merchantId,
            },
            include: {
                commissions: true,
            },
        });
        if (!findMerchant || !findMerchant.payFastMerchantId) {
            throw new CustomError("Merchant not found", 404);
        }
        const phone = transactionService.convertPhoneNumber(params.phone);
        let id2 = params.order_id || id;
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
        myHeaders.append("Authorization", `Bearer ${params.token}`);
        const urlencoded = new URLSearchParams();
        urlencoded.append("basket_id", id2);
        urlencoded.append("txnamt", params.amount);
        urlencoded.append("customer_email_address", params.email);
        urlencoded.append("account_type_id", "4");
        urlencoded.append("customer_mobile_no", "03453076786");
        urlencoded.append("account_number", params.phone);
        urlencoded.append("bank_code", params.bankCode);
        urlencoded.append("order_date", formatter.format(new Date()));
        urlencoded.append("transaction_id", params.transaction_id);
        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: urlencoded,
            redirect: "follow"
        };
        // Save transaction immediately with "pending" status
        let commission;
        if (findMerchant.commissions[0].commissionMode == "SINGLE") {
            commission = +findMerchant.commissions[0].commissionGST +
                +findMerchant.commissions[0].commissionRate +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        else {
            commission = +findMerchant.commissions[0].commissionGST +
                +(findMerchant.commissions[0]?.easypaisaRate ?? 0) +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        saveTxn = await transactionService.createTxn({
            order_id: id2,
            transaction_id: id,
            amount: params.amount,
            status: "pending",
            type: params.type,
            merchant_id: findMerchant.merchant_id,
            commission,
            settlementDuration: findMerchant.commissions[0].settlementDuration,
            providerDetails: {
                id: findMerchant.payFastMerchantId,
                name: PROVIDERS.EASYPAISA,
                msisdn: phone,
            },
        });
        console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", system_id: id, order_id: params.order_id }));
        // Return pending status and transaction ID immediately
        setImmediate(async () => {
            try {
                let result = await fetch("https://apipxy.apps.net.pk:8443/api/transaction", requestOptions)
                    .then((response) => response.json())
                    .then((result) => result)
                    .catch((error) => error);
                if (result.status_code === "00") {
                    console.log(JSON.stringify({ event: "PAYFAST_ASYNC_SUCCESS", order_id: params.order_id, system_id: id, response: result }));
                    await transactionService.updateTxn(saveTxn?.transaction_id, {
                        status: "completed",
                        response_message: result.message,
                        providerDetails: {
                            id: findMerchant.payFastMerchantId,
                            name: PROVIDERS.EASYPAISA,
                            msisdn: phone,
                            transactionId: result?.transaction_id,
                            sub_name: PROVIDERS.PAYFAST
                        },
                    }, findMerchant.commissions[0].settlementDuration);
                    transactionService.sendCallbackClone(findMerchant.webhook_url, saveTxn, phone, "payin", findMerchant?.encrypted?.toLowerCase() == "true" ? true : false, true);
                }
                else {
                    console.log("Response: ", result);
                    console.log(JSON.stringify({ event: "PAYFAST_ASYNC_FAILED", order_id: params.order_id, system_id: id, response: result }));
                    await transactionService.updateTxn(saveTxn?.transaction_id, {
                        status: "failed",
                        response_message: result.message,
                        providerDetails: {
                            id: findMerchant.payFastMerchantId,
                            name: PROVIDERS.EASYPAISA,
                            msisdn: phone,
                            transactionId: result?.transaction_id,
                            sub_name: PROVIDERS.PAYFAST
                        },
                    }, findMerchant.commissions[0].settlementDuration);
                }
            }
            catch (error) {
                console.log(JSON.stringify({
                    event: "EASYPAISA_PAYIN_ERROR", order_id: params.order_id, system_id: id, error: {
                        message: error?.message,
                        response: error?.response?.data || null,
                        statusCode: error?.statusCode || error?.response?.status || null,
                    }
                }));
                await transactionService.updateTxn(saveTxn?.transaction_id, {
                    status: "failed",
                    response_message: error.message,
                    providerDetails: {
                        id: findMerchant.payFastMerchantId,
                        name: PROVIDERS.EASYPAISA,
                        msisdn: phone,
                        transactionId: params?.transaction_id,
                        sub_name: PROVIDERS.PAYFAST
                    },
                }, findMerchant.commissions[0].settlementDuration);
            }
        });
        return {
            txnNo: saveTxn.merchant_transaction_id,
            txnDateTime: saveTxn.date_time,
            statusCode: "pending",
        };
    }
    catch (error) {
        console.log(JSON.stringify({
            event: "PAYFAST_ASYNC_ERROR", order_id: params.order_id, error: {
                message: error?.message || "An error occurred while initiating the transaction",
                statusCode: error?.statusCode || 500,
                txnNo: saveTxn?.merchant_transaction_id
            }
        }));
        return {
            message: error?.message || "An error occurred while initiating the transaction",
            statusCode: error?.statusCode || 500,
            txnNo: saveTxn?.merchant_transaction_id || null,
        };
    }
};
const payCnic = async (merchantId, params) => {
    let saveTxn;
    try {
        console.log(JSON.stringify({ event: "PAYFAST_CNIC_PAYMENT_REQUEST", order_id: params.order_id, body: params }));
        let id = transactionService.createTransactionId();
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_INITIATED", order_id: params.order_id, system_order_id: id }));
        let findMerchant = await prisma.merchant.findFirst({
            where: {
                uid: merchantId
            },
            include: {
                commissions: true
            }
        });
        if (!findMerchant) {
            throw new CustomError("Merchant Not Found", 500);
        }
        let id2 = params.order_id || id;
        saveTxn = await prisma.transaction.findUnique({
            where: {
                merchant_transaction_id: params.transactionId
            }
        });
        console.log(saveTxn?.providerDetails?.cnic);
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
        myHeaders.append("Authorization", `Bearer ${params.token}`);
        console.log(JSON.stringify(saveTxn?.original_amount));
        const urlencoded = new URLSearchParams();
        urlencoded.append("basket_id", id2);
        urlencoded.append("txnamt", saveTxn?.original_amount);
        urlencoded.append("customer_email_address", "example@example.com");
        urlencoded.append("account_type_id", "4");
        urlencoded.append("customer_mobile_no", "03453076786");
        urlencoded.append("account_number", saveTxn?.providerDetails?.msisdn);
        urlencoded.append("bank_code", params.bankCode);
        urlencoded.append("order_date", formatter.format(new Date()));
        urlencoded.append("transaction_id", params.transaction_id);
        urlencoded.append("cnic_number", saveTxn?.providerDetails?.cnic);
        urlencoded.append('otp', params.otp);
        console.log(urlencoded);
        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: urlencoded,
            redirect: "follow"
        };
        // Save transaction immediately with "pending" status
        console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", order_id: params.order_id, system_order_id: id }));
        let result = await fetch("https://apipxy.apps.net.pk:8443/api/transaction", requestOptions)
            .then((response) => response.json())
            .then((result) => result)
            .catch((error) => error);
        if (result.status_code == "00") {
            console.log(JSON.stringify({ event: "PAYFAST_PAYIN_SUCCESS", order_id: params.order_id, system_order_id: id, response: result }));
            const updateTxn = await transactionService.updateTxn(saveTxn?.transaction_id, {
                status: "completed",
                response_message: result.message,
                providerDetails: {
                    id: 1,
                    name: params.bankCode == "14" ? PROVIDERS.UPAISA : PROVIDERS.ZINDIGI,
                    msisdn: saveTxn?.providerDetails?.msisdn,
                    transactionId: result.transaction_id,
                    sub_name: PROVIDERS.PAYFAST
                }
            }, findMerchant.commissions[0].settlementDuration);
            transactionService.sendCallback(findMerchant.webhook_url, saveTxn, JSON.stringify(saveTxn?.providerDetails?.msisdn), "payin", findMerchant.encrypted == "True" ? true : false, true);
            console.log(JSON.stringify({
                event: "PAYFAST_CNIC_PAYMENT_RESPONSE", order_id: params.order_id, body: {
                    txnNo: saveTxn?.merchant_transaction_id,
                    txnDateTime: saveTxn?.date_time,
                    statusCode: result?.status_code
                }
            }));
            return {
                txnNo: saveTxn?.merchant_transaction_id,
                txnDateTime: saveTxn?.date_time,
                statusCode: result?.status_code
            };
        }
        else {
            console.log(JSON.stringify({ event: "PAYFAST_PAYIN_FAILED", order_id: params.order_id, system_order_id: id, response: result }));
            const updateTxn = await transactionService.updateTxn(saveTxn?.transaction_id, {
                status: "failed",
                response_message: result.message,
                providerDetails: {
                    id: 1,
                    name: params.bankCode == "14" ? PROVIDERS.UPAISA : PROVIDERS.ZINDIGI,
                    msisdn: saveTxn?.providerDetails?.msisdn,
                    transactionId: result.transaction_id,
                    cnic: saveTxn?.providerDetails?.cnic,
                    sub_name: PROVIDERS.PAYFAST
                }
            }, findMerchant.commissions[0].settlementDuration);
            throw new CustomError(result?.status_msg, 500);
        }
    }
    catch (err) {
        console.log(err);
        console.log(JSON.stringify({
            event: "PAYFAST_PAYIN_ERROR", order_id: params.order_id, error: {
                message: err?.message || "An error occurred while initiating the transaction",
                statusCode: err?.statusCode || 500,
                txnNo: saveTxn?.merchant_transaction_id
            }
        }));
        return {
            message: err?.message || "An error occurred while initiating the transaction",
            statusCode: err?.statusCode || 500,
            txnNo: saveTxn?.merchant_transaction_id
        };
    }
};
const getPayFastMerchant = async (params) => {
    try {
        const where = {};
        if (params?.merchantId)
            where["merchantId"] = parseInt(params.merchantId);
        const jazzCashConfig = await prisma.payFastMerchant.findMany({
            where,
        });
        if (!jazzCashConfig) {
            throw new CustomError("JazzCash configuration not found", 404);
        }
        return jazzCashConfig;
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred", 500);
    }
};
const createPayFastMerchant = async (merchantData) => {
    try {
        const jazzCashConfig = await prisma.$transaction(async (prisma) => {
            const newMerchant = await prisma.payFastMerchant.create({
                data: merchantData,
            });
            return newMerchant;
        });
        return jazzCashConfig;
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred", 500);
    }
};
const updatePayFastMerchant = async (merchantId, updateData) => {
    try {
        const updatedMerchant = await prisma.$transaction(async (prisma) => {
            const merchant = await prisma.payFastMerchant.update({
                where: { id: merchantId },
                data: updateData,
            });
            return merchant;
        });
        return updatedMerchant;
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred", 500);
    }
};
const deletePayFastMerchant = async (merchantId) => {
    try {
        const deletedMerchant = await prisma.$transaction(async (prisma) => {
            const merchant = await prisma.payFastMerchant.delete({
                where: { id: merchantId },
            });
            return merchant;
        });
        return deletedMerchant;
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred", 500);
    }
};
function convertDateLocal(dateString) {
    console.log(dateString);
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const amPm = hours >= 12 ? 'PM' : 'AM';
    console.log(hours, minutes, amPm);
    hours = hours % 12 || 12;
    hours = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes} ${amPm}`;
}
const databaseStatusInquiry = async (merchantId, transactionId) => {
    try {
        const id = await prisma.merchant.findFirst({
            where: {
                uid: merchantId,
            },
            select: {
                merchant_id: true
            }
        });
        if (!id) {
            throw new CustomError("Merchant Not Found", 400);
        }
        const txn = await prisma.transaction.findFirst({
            where: {
                merchant_transaction_id: transactionId,
                merchant_id: id?.merchant_id,
            },
        });
        console.log(transactionId);
        if (!txn) {
            return {
                message: "Transaction not found",
                statusCode: 500
            };
        }
        // orderId, transactionStatus, transactionAmount / amount, transactionDateTime / createdDateTime, msisdn, responseDesc/ transactionStatus, responseMode: "MA"
        let data = {
            "orderId": txn?.merchant_transaction_id,
            "transactionStatus": txn?.status.toUpperCase(),
            "transactionAmount": Number(txn?.original_amount),
            "transactionDateTime": convertDateLocal(txn?.date_time.toISOString()),
            "msisdn": txn?.providerDetails?.msisdn,
            "responseDesc": txn?.response_message || "",
            "responseMode": "MA",
            // "statusCode": 201
        };
        return data;
    }
    catch (err) {
        throw new CustomError(err?.message || "Error getting transaction", 500);
    }
};
const getPayfastInquiryMethod = async (merchantId) => {
    return await prisma.merchant.findFirst({
        where: {
            uid: merchantId
        },
        select: {
            payfastInquiryMethod: true
        }
    });
};
const payfastStatusInquiry = async (merchantId, transactionId, token) => {
    try {
        const id = await prisma.merchant.findFirst({
            where: {
                uid: merchantId,
            },
            select: {
                merchant_id: true
            }
        });
        if (!id) {
            throw new CustomError("Merchant Not Found", 400);
        }
        console.log(transactionId);
        const txn = await prisma.transaction.findFirst({
            where: {
                merchant_transaction_id: transactionId,
                // merchant_id: id?.merchant_id,
            },
        });
        if (!txn) {
            return {
                message: "Transaction not found",
                statusCode: 500
            };
        }
        const myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${token}`);
        const requestOptions = {
            method: "GET",
            headers: myHeaders,
            redirect: "follow"
        };
        const result = await fetch(`https://apipxy.apps.net.pk:8443/api/transaction/${txn?.providerDetails?.transactionId}`, requestOptions)
            .then((response) => response.json())
            .then((result) => result)
            .catch((error) => error);
        console.log(result);
        let data = {
            "orderId": txn?.merchant_transaction_id,
            "transactionStatus": result?.status_msg.toUpperCase() == "SUCCESS" ? "COMPLETED" : "FAILED",
            "transactionAmount": Number(txn?.original_amount),
            "transactionDateTime": convertDateLocal(txn?.date_time.toISOString()),
            "msisdn": txn?.providerDetails?.msisdn,
            "responseDesc": txn?.response_message || "",
            "responseMode": "MA",
        };
        return data;
    }
    catch (err) {
        throw new CustomError(err?.message || "Error getting transaction", 500);
    }
};
export default {
    pay,
    validateCustomerInformation,
    getApiToken,
    payAsync,
    getPayFastMerchant,
    createPayFastMerchant,
    updatePayFastMerchant,
    deletePayFastMerchant,
    payCnic,
    validateCustomerInformationForCnic,
    databaseStatusInquiry,
    payfastStatusInquiry,
    getPayfastInquiryMethod,
    payAsyncClone
};

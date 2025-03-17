import { PROVIDERS } from "constants/providers.js";
import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";

const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const
});

const getApiToken = async (merchantId: string, params: any) => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");
    urlencoded.append("secured_key", "HbRqMqNCY9Gfl1yKEOGNwZob");
    urlencoded.append("merchant_id", "24663");

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: urlencoded,
        redirect: "follow"
    };

    let result = await fetch("https://apipxy.apps.net.pk:8443/api/token", requestOptions as RequestInit)
        .then((response) => response.json())
        .then((result) => result)
        .catch((error) => error);

    console.log("Result: ", result);
    return result;
}

const validateCustomerInformation = async (merchantId: string, params: any) => {
    const myHeaders = new Headers();
    const phone = transactionService.convertPhoneNumber(params.phone)
    let id = transactionService.createTransactionId();
    let id2 = params.order_id || id;
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    myHeaders.append("Authorization", `Bearer ${params.token}`);

    const urlencoded = new URLSearchParams();
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

    let result = await fetch("https://apipxy.apps.net.pk:8443/api/customer/validate", requestOptions as RequestInit)
        .then((response) => response.json())
        .then((result) => result)
        .catch((error) => error);

    console.log("Result: ", result);
    return result;
}

const pay = async (merchantId: string, params: any) => {
    let saveTxn;
    try {
        let id = transactionService.createTransactionId();
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_INITIATED", order_id: params.order_id, system_order_id: id }))
        let findMerchant = await prisma.merchant.findFirst({
            where: {
                uid: merchantId
            },
            include: {
                commissions: true
            }
        })

        if (!findMerchant) {
            throw new CustomError("Merchant Not Found", 500);
        }
        const phone = transactionService.convertPhoneNumber(params.phone)
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
                +findMerchant.commissions[0].commissionWithHoldingTax
        }
        else {
            commission = +findMerchant.commissions[0].commissionGST +
                +(findMerchant.commissions[0]?.easypaisaRate ?? 0) +
                +findMerchant.commissions[0].commissionWithHoldingTax
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
                id: 1,
                name: PROVIDERS.EASYPAISA,
                msisdn: phone
            },
        });

        console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", order_id: params.order_id, system_order_id: id }))


        let result = await fetch("https://apipxy.apps.net.pk:8443/api/transaction", requestOptions as RequestInit)
            .then((response) => response.json())
            .then((result) => result)
            .catch((error) => error);

        if (result.status_code == "00") {
            console.log(JSON.stringify({ event: "PAYFAST_PAYIN_SUCCESS", order_id: params.order_id, system_order_id: id, response: result }))
            const updateTxn = await transactionService.updateTxn(
                saveTxn.transaction_id,
                {
                    status: "completed",
                    response_message: result.message,
                },
                findMerchant.commissions[0].settlementDuration
            );
            transactionService.sendCallback(
                findMerchant.webhook_url as string,
                saveTxn,
                phone,
                "payin",
                findMerchant.encrypted == "True" ? true : false,
                true
            );
            return {
                txnNo: saveTxn.merchant_transaction_id,
                txnDateTime: saveTxn.date_time,
                statusCode: result?.status_code
            };
        }
        else {
            console.log(JSON.stringify({ event: "PAYFAST_PAYIN_FAILED", order_id: params.order_id, system_order_id: id, response: result }))
            const updateTxn = await transactionService.updateTxn(
                saveTxn.transaction_id,
                {
                    status: "failed",
                    response_message: result.message,
                },
                findMerchant.commissions[0].settlementDuration
            );

            throw new CustomError(
                result?.status_msg,
                500
            );
        }
    }
    catch (err: any) {
        console.log(JSON.stringify({
            event: "PAYFAST_PAYIN_ERROR", order_id: params.order_id, error: {
                message: err?.message || "An error occurred while initiating the transaction",
                statusCode: err?.statusCode || 500,
                txnNo: saveTxn?.merchant_transaction_id
            }
        }))
        return {
            message: err?.message || "An error occurred while initiating the transaction",
            statusCode: err?.statusCode || 500,
            txnNo: saveTxn?.merchant_transaction_id
        }
    }
}

const payAsync = async (merchantId: string, params: any) => {
    let saveTxn: Awaited<ReturnType<typeof transactionService.createTxn>> | undefined;
    let id = transactionService.createTransactionId();
    try {
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_INITIATED", order_id: params.order_id, system_order_id: id }))
        const findMerchant = await prisma.merchant.findFirst({
            where: {
                uid: merchantId,
            },
            include: {
                commissions: true,
            },
        });

        if (!findMerchant || !findMerchant.easyPaisaMerchantId) {
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
                +findMerchant.commissions[0].commissionWithHoldingTax
        }
        else {
            commission = +findMerchant.commissions[0].commissionGST +
                +(findMerchant.commissions[0]?.easypaisaRate ?? 0) +
                +findMerchant.commissions[0].commissionWithHoldingTax
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
                id: 1,
                name: PROVIDERS.EASYPAISA,
                msisdn: phone,
            },
        });
        console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", system_id: id, order_id: params.order_id }))
        // Return pending status and transaction ID immediately
        setImmediate(async () => {
            try {
                let result = await fetch("https://apipxy.apps.net.pk:8443/api/transaction", requestOptions as RequestInit)
                    .then((response) => response.json())
                    .then((result) => result)
                    .catch((error) => error);

                if (result.status_code === "00") {
                    console.log(JSON.stringify({ event: "PAYFAST_ASYNC_SUCCESS", order_id: params.order_id, system_id: id, response: result }))
                    await transactionService.updateTxn(
                        saveTxn?.transaction_id as string,
                        {
                            status: "completed",
                            response_message: result.message,
                            providerDetails: {
                                id: 1,
                                name: PROVIDERS.EASYPAISA,
                                msisdn: phone,
                                transactionId: result.transaction_id
                            },
                        },
                        findMerchant.commissions[0].settlementDuration
                    );

                    transactionService.sendCallback(
                        findMerchant.webhook_url as string,
                        saveTxn,
                        phone,
                        "payin",
                        true,
                        true
                    );
                } else {
                    console.log("Response: ", result)
                    console.log(JSON.stringify({ event: "PAYFAST_ASYNC_FAILED", order_id: params.order_id, system_id: id, response: result }))

                    await transactionService.updateTxn(
                        saveTxn?.transaction_id as string,
                        {
                            status: "failed",
                            response_message: result.message,
                            providerDetails: {
                                id: 1,
                                name: PROVIDERS.EASYPAISA,
                                msisdn: phone,
                                transactionId: result.transaction_id
                            },
                        },
                        findMerchant.commissions[0].settlementDuration
                    );
                }
            } catch (error: any) {
                console.log(JSON.stringify({
                    event: "EASYPAISA_PAYIN_ERROR", order_id: params.order_id, system_id: id, error: {
                        message: error?.message,
                        response: error?.response?.data || null,
                        statusCode: error?.statusCode || error?.response?.status || null,
                    }
                }))
                await transactionService.updateTxn(
                    saveTxn?.transaction_id as string,
                    {
                        status: "failed",
                        response_message: error.message,
                        providerDetails: {
                            id: 1,
                            name: PROVIDERS.EASYPAISA,
                            msisdn: phone,
                        },
                    },
                    findMerchant.commissions[0].settlementDuration
                );
            }
        });

        return {
            txnNo: saveTxn.merchant_transaction_id,
            txnDateTime: saveTxn.date_time,
            statusCode: "pending",
        };
    } catch (error: any) {
        console.log(JSON.stringify({
            event: "PAYFAST_ASYNC_ERROR", order_id: params.order_id, error: {
                message: error?.message || "An error occurred while initiating the transaction",
                statusCode: error?.statusCode || 500,
                txnNo: saveTxn?.merchant_transaction_id
            }
        }))
        return {
            message:
                error?.message || "An error occurred while initiating the transaction",
            statusCode: error?.statusCode || 500,
            txnNo: saveTxn?.merchant_transaction_id || null,
        };
    }
};

const getPayFastMerchant = async (params: any) => {
    try {
        const where: any = {};

        if (params?.merchantId) where["merchantId"] = parseInt(params.merchantId);

        const jazzCashConfig = await prisma.payFastMerchant.findMany({
            where,
        });

        if (!jazzCashConfig) {
            throw new CustomError("JazzCash configuration not found", 404);
        }

        return jazzCashConfig;
    } catch (error: any) {
        throw new CustomError(error?.message || "An error occurred", 500);
    }
};

const createPayFastMerchant = async (merchantData: any) => {
    try {
        const jazzCashConfig = await prisma.$transaction(async (prisma) => {
            const newMerchant = await prisma.payFastMerchant.create({
                data: merchantData,
            });
            return newMerchant;
        });

        return jazzCashConfig;
    } catch (error: any) {
        throw new CustomError(error?.message || "An error occurred", 500);
    }
};

const updatePayFastMerchant = async (merchantId: number, updateData: any) => {
    try {
        const updatedMerchant = await prisma.$transaction(async (prisma) => {
            const merchant = await prisma.payFastMerchant.update({
                where: { id: merchantId },
                data: updateData,
            });
            return merchant;
        });

        return updatedMerchant;
    } catch (error: any) {
        throw new CustomError(error?.message || "An error occurred", 500);
    }
};

const deletePayFastMerchant = async (merchantId: number) => {
    try {
        const deletedMerchant = await prisma.$transaction(async (prisma) => {
            const merchant = await prisma.payFastMerchant.delete({
                where: { id: merchantId },
            });
            return merchant;
        });

        return deletedMerchant;
    } catch (error: any) {
        throw new CustomError(error?.message || "An error occurred", 500);
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
    deletePayFastMerchant
}
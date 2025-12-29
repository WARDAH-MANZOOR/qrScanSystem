import { backofficeService, easyPaisaDisburse, easyPaisaService, merchantService, transactionService } from "../../services/index.js";
import CustomError from "../../utils/custom_error.js";
import { decryptData, encryptData } from "../../utils/enc_dec.js";
import { calculateDisbursement, getEligibleTransactions, getMerchantRate, getWalletBalance, updateTransactions } from "./disbursement.js";
import prisma from "../../prisma/client.js";
import { Decimal } from "@prisma/client/runtime/library";
import { PROVIDERS } from "../../constants/providers.js";
import jazzcashDisburse from "./jazzcashDisburse.js";
import { toZonedTime } from "date-fns-tz";
import { Prisma } from "@prisma/client";
import { UpdateDisbursementPayload } from "../../types/providers.js";


function stringToBoolean(value: string): boolean {
  return value.toLowerCase() === "true";
}

function formatAmount(amount: number): string {
  // Ensure the number is fixed to two decimal places
  return amount.toFixed(2);
}

async function getToken(merchantId: string) {
  try {
    // validate Merchant
    const findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Basic ${findDisbureMerch.tokenKey}`);
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      // redirect: "follow"
    };

    const token = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-token`, requestOptions)
      .then((response) => response.json())
      .then((result) => result)
      .catch((error) => error);
    console.log(token);
    return token;
  } catch (error) {
    console.error('Fetch error:', error);

  }
}

async function simpleSandboxGetToken(merchantId: string) {
  try {
    // validate Merchant
    const findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Basic ${findDisbureMerch.tokenKey}`);
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    console.log("Disbursement Merchant: ", findDisbureMerch)
    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      // redirect: "follow"
    };

    const token = await fetch(`https://jazz-sandbox.sahulatpay.com/sjzd-token`, requestOptions)
      .then((response) => response.json())
      .then((result) => result)
      .catch((error) => error);
    console.log(token);
    return token;
  } catch (error) {
    console.error('Fetch error:', error);
    return error;
  }
}

async function simpleGetToken(merchantId: string) {
  try {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Basic RWlNV1JPYkhJekNIWHRLM1lRdnZFXzhYVU5JYTpVMkdaazhHNWE0UW5DSFRXTnZGeXhFR2JFbXNh`);
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      // redirect: "follow"
    };

    const token = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-token`, requestOptions)
      .then((response) => response.json())
      .then((result) => result)
      .catch((error) => error);
    console.log(token);
    return token;
  } catch (error) {
    console.error('Fetch error:', error);

  }
}

// async function initiateTransaction(token: string, body: any, merchantId: string) {
//   let findMerchant: any;
//   let walletBalance;
//   let totalDisbursed: number | Decimal = new Decimal(0);
//   try {
//     // validate Merchant
//     findMerchant = await merchantService.findOne({
//       uid: merchantId,
//     });

//     let balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
//     walletBalance = balance.walletBalance;
//     if (!findMerchant) {
//       throw new CustomError("Merchant not found", 404);
//     }

//     if (!findMerchant.JazzCashDisburseAccountId) {
//       throw new CustomError("Disbursement account not assigned.", 404);
//     }

//     // find disbursement merchant
//     const findDisbureMerch: any = await jazzcashDisburse
//       .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
//       .then((res) => res?.data);

//     if (!findDisbureMerch) {
//       throw new CustomError("Disbursement account not found", 404);
//     }

//     if (body.order_id) {
//       const checkOrder = await prisma.disbursement.findFirst({
//         where: {
//           merchant_custom_order_id: body.order_id,
//         },
//       });
//       if (checkOrder) {
//         throw new CustomError("Order ID already exists", 400);
//       }
//     }
//     let totalCommission: Decimal = new Decimal(0);
//     let totalGST: Decimal = new Decimal(0);
//     let totalWithholdingTax: Decimal = new Decimal(0);
//     let amountDecimal: Decimal = new Decimal(0);
//     let merchantAmount: Decimal = new Decimal(0);
//     totalDisbursed = new Decimal(0);
//     await prisma.$transaction(async (tx) => {
//       let rate = await getMerchantRate(tx, findMerchant.merchant_id);

//       const transactions = await getEligibleTransactions(
//         findMerchant.merchant_id,
//         tx
//       );
//       if (transactions.length === 0) {
//         throw new CustomError("No eligible transactions to disburse", 400);
//       }
//       let updates: TransactionUpdate[] = [];
//       totalDisbursed = new Decimal(0);
//       if (body.amount) {
//         amountDecimal = new Decimal(body.amount);
//       } else {
//         updates = transactions.map((t: any) => ({
//           transaction_id: t.transaction_id,
//           disbursed: true,
//           balance: new Decimal(0),
//           settled_amount: t.settled_amount,
//           original_amount: t.original_amount,
//         }));
//         totalDisbursed = transactions.reduce(
//           (sum: Decimal, t: any) => sum.plus(t.balance),
//           new Decimal(0)
//         );
//         amountDecimal = totalDisbursed;
//       }
//       // Calculate total deductions and merchant amount
//       totalCommission = amountDecimal.mul(rate.disbursementRate);
//       totalGST = amountDecimal.mul(rate.disbursementGST);
//       totalWithholdingTax = amountDecimal.mul(
//         rate.disbursementWithHoldingTax
//       );
//       const totalDeductions = totalCommission
//         .plus(totalGST)
//         .plus(totalWithholdingTax);
//       merchantAmount = body.amount
//         ? amountDecimal.plus(totalDeductions)
//         : amountDecimal.minus(totalDeductions);

//       // Get eligible transactions

//       if (body.amount) {
//         const result = calculateDisbursement(transactions, merchantAmount);
//         updates = result.updates;
//         totalDisbursed = totalDisbursed.plus(result.totalDisbursed);
//       }
//       await updateTransactions(updates, tx);
//     }, {
//       // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
//       isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
//       maxWait: 60000,
//       timeout: 60000,
//     })
//     let id = transactionService.createTransactionId();
//     console.log("Initiate Request: ", {
//       bankAccountNumber: body.iban,
//       bankCode: body.bankCode,
//       amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
//       receiverMSISDN: body.phone,
//       referenceId: id
//     })

//     let payload = encryptData(
//       {
//         bankAccountNumber: body.iban,
//         bankCode: body.bankCode,
//         amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
//         receiverMSISDN: body.phone,
//         referenceId: id
//       }
//       , findDisbureMerch.key, findDisbureMerch.initialVector)
//     let db_id = id;
//     let requestData = {
//       data: payload,
//     };
//     const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

//     // Example usage
//     (async () => {
//       await delay(1000); // Wait for 1 second
//     })();
//     let response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-i`, {
//       method: 'POST',
//       headers: {
//         'Accept': 'application/json',
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(requestData)
//     });
//     let res = await response.json();
//     let data;
//     if (!res.data) {
//       totalDisbursed = walletBalance + +totalDisbursed;
//       await backofficeService.adjustMerchantWalletBalance(findMerchant.merchant_id, totalDisbursed, false, walletBalance);
//       throw new CustomError("Throttled", 500);
//     }
//     data = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
//     console.log("Initiate Response: ", data)
//     let data2: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string; } = {};
//     if (data.responseCode != "G2P-T-0") {
//       console.log("IBFT Response: ", data);
//       if (body.order_id) {
//         data2["merchant_custom_order_id"] = body.order_id;
//       }
//       else {
//         data2["merchant_custom_order_id"] = db_id;
//       }
//       // else {
//       data2["transaction_id"] = res.transactionID;
//       data2["system_order_id"] = db_id;
//       // Get the current date
//       const date = new Date();

//       // Define the Pakistan timezone
//       const timeZone = 'Asia/Karachi';

//       // Convert the date to the Pakistan timezone
//       const zonedDate = toZonedTime(date, timeZone);
//       await prisma.disbursement.create({
//         data: {
//           ...data2,
//           // transaction_id: id,
//           merchant_id: Number(findMerchant.merchant_id),
//           disbursementDate: zonedDate,
//           transactionAmount: amountDecimal,
//           commission: totalCommission,
//           gst: totalGST,
//           withholdingTax: totalWithholdingTax,
//           merchantAmount: body.amount ? body.amount : merchantAmount,
//           platform: 0,
//           account: body.iban,
//           provider: PROVIDERS.BANK,
//           status: "failed",
//           response_message: data.responseDescription
//         },
//       });
//       throw new CustomError(data.responseDescription, 500)
//     }

//     id = transactionService.createTransactionId();
//     console.log("Confirm Request: ", {
//       "Init_transactionID": data.transactionID,
//       "referenceID": id
//     })

//     payload = encryptData({
//       "Init_transactionID": data.transactionID,
//       "referenceID": id
//     }, findDisbureMerch.key, findDisbureMerch.initialVector)

//     requestData = {
//       data: payload
//     };
//     // Example usage
//     (async () => {
//       await delay(1000); // Wait for 1 second
//     })();
//     response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-t`, {
//       method: "POST",
//       headers: {
//         'Accept': 'application/json',
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(requestData)
//     })
//     res = await response.json();
//     if (!res.data) {
//       totalDisbursed = walletBalance + +totalDisbursed;
//       await backofficeService.adjustMerchantWalletBalance(findMerchant.merchant_id, totalDisbursed, false, walletBalance);
//       throw new CustomError("Throttled", 500);
//     }
//     res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);

//     if (res.responseCode != "G2P-T-0") {
//       console.log("IBFT Response: ", data);
//       totalDisbursed = walletBalance + +totalDisbursed;
//       await backofficeService.adjustMerchantWalletBalance(findMerchant.merchant_id, totalDisbursed, false);
//       if (body.order_id) {
//         data2["merchant_custom_order_id"] = body.order_id;
//       }
//       else {
//         data2["merchant_custom_order_id"] = db_id;
//       }
//       // else {
//       data2["transaction_id"] = res.transactionID;
//       data2["system_order_id"] = db_id;
//       // Get the current date
//       const date = new Date();

//       // Define the Pakistan timezone
//       const timeZone = 'Asia/Karachi';

//       // Convert the date to the Pakistan timezone
//       const zonedDate = toZonedTime(date, timeZone);
//       await prisma.disbursement.create({
//         data: {
//           ...data2,
//           // transaction_id: id,
//           merchant_id: Number(findMerchant.merchant_id),
//           disbursementDate: zonedDate,
//           transactionAmount: amountDecimal,
//           commission: totalCommission,
//           gst: totalGST,
//           withholdingTax: totalWithholdingTax,
//           merchantAmount: body.amount ? body.amount : merchantAmount,
//           platform: 0,
//           account: body.iban,
//           provider: PROVIDERS.BANK,
//           status: "failed",
//           response_message: res.responseDescription
//         },
//       });
//       throw new CustomError(res.responseDescription, 500)
//     }
//     return await prisma.$transaction(
//       async (tx) => {
//         // Update transactions to adjust balances

//         if (body.order_id) {
//           data2["merchant_custom_order_id"] = body.order_id;
//         }
//         else {
//           data2["merchant_custom_order_id"] = db_id;
//         }
//         // else {
//         data2["system_order_id"] = db_id;
//         data2["transaction_id"] = res.transactionID;
//         // }
//         // Get the current date
//         const date = new Date();

//         // Define the Pakistan timezone
//         const timeZone = 'Asia/Karachi';

//         // Convert the date to the Pakistan timezone
//         const zonedDate = toZonedTime(date, timeZone);
//         // Create disbursement record
//         let disbursement = await tx.disbursement.create({
//           data: {
//             ...data2,
//             // transaction_id: id,
//             merchant_id: Number(findMerchant.merchant_id),
//             disbursementDate: zonedDate,
//             transactionAmount: amountDecimal,
//             commission: totalCommission,
//             gst: totalGST,
//             withholdingTax: totalWithholdingTax,
//             merchantAmount: body.amount ? body.amount : merchantAmount,
//             platform: 0,
//             account: body.iban,
//             provider: PROVIDERS.BANK,
//             status: "completed",
//             response_message: "success"
//           },
//         });
//         let webhook_url: string;
//         if (findMerchant.callback_mode == "DOUBLE") {
//           webhook_url = findMerchant.payout_callback as string;
//         }
//         else {
//           webhook_url = findMerchant.webhook_url as string;
//         }
//         transactionService.sendCallback(
//           webhook_url,
//           {
//             original_amount: body.amount ? body.amount : merchantAmount,
//             date_time: zonedDate,
//             merchant_transaction_id: disbursement.merchant_custom_order_id,
//             merchant_id: findMerchant.merchant_id
//           },
//           body.phone,
//           "payout",
//           stringToBoolean(findMerchant.encrypted as string),
//           false
//         );

//         return {
//           message: "Disbursement created successfully",
//           merchantAmount: body.amount
//             ? body.amount.toString()
//             : merchantAmount.toString(),
//           order_id: disbursement.merchant_custom_order_id,
//           externalApiResponse: {
//             TransactionReference: disbursement.merchant_custom_order_id,
//             TransactionStatus: "success",
//           },
//         };
//       }, {
//       isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
//       maxWait: 60000,
//       timeout: 60000,
//     }
//     );
//   }
//   catch (err: any) {
//     console.log("Initiate Transaction Error", err);
//     throw new CustomError(err?.message, 500);
//   }
// }

async function initiateTransaction(token: string, body: any, merchantId: string) {
  let findMerchant: any;
  let walletBalance;
  let totalDisbursed: number | Decimal = new Decimal(0);
  let balanceDeducted = false;
  let merchantAmount: Decimal = new Decimal(0);
  try {
    // validate Merchant
    findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    let balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
    walletBalance = balance.walletBalance;
    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    if (body.order_id) {
      const checkOrder = await prisma.disbursement.findFirst({
        where: {
          merchant_custom_order_id: body.order_id,
        },
      });
      if (checkOrder) {
        throw new CustomError("Order ID already exists", 400);
      }
    }
    let totalCommission: Decimal = new Decimal(0);
    let totalGST: Decimal = new Decimal(0);
    let totalWithholdingTax: Decimal = new Decimal(0);
    let amountDecimal: Decimal = new Decimal(body.amount);
    merchantAmount = new Decimal(body.amount);
    totalDisbursed = new Decimal(0);
    let id = transactionService.createTransactionId();
    let data2: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string; } = {};
    if (body.order_id) {
      data2["merchant_custom_order_id"] = body.order_id;
    }
    else {
      data2["merchant_custom_order_id"] = id;
    }
    data2["system_order_id"] = id;
    await prisma.$transaction(async (tx) => {
      try {
        let rate = await getMerchantRate(tx, findMerchant.merchant_id);

        // Calculate total deductions and merchant amount
        totalCommission = amountDecimal.mul(rate.disbursementRate);
        totalGST = amountDecimal.mul(rate.disbursementGST);
        totalWithholdingTax = amountDecimal.mul(
          rate.disbursementWithHoldingTax
        );
        const totalDeductions = totalCommission
          .plus(totalGST)
          .plus(totalWithholdingTax);
        merchantAmount = body.amount
          ? amountDecimal.plus(totalDeductions)
          : amountDecimal.minus(totalDeductions);

        // Get eligible transactions
        if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
          throw new CustomError("Insufficient balance to disburse", 400);
        }
        const result = await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, false);
        balanceDeducted = true;
      }
      catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === 'P2034') {
            await prisma.disbursement.create({
              data: {
                ...data2,
                // transaction_id: id,
                merchant_id: Number(findMerchant.merchant_id),
                disbursementDate: new Date(),
                transactionAmount: amountDecimal,
                commission: totalCommission,
                gst: totalGST,
                withholdingTax: totalWithholdingTax,
                merchantAmount: body.amount ? body.amount : merchantAmount,
                platform: 0,
                account: body.iban,
                provider: PROVIDERS.JAZZ_CASH,
                status: "pending",
                response_message: "pending",
                to_provider: body.bankCode
              },
            });
            throw new CustomError("Transaction is Pending", 202);
          }
        }
        throw new CustomError("Not Enough Balance", 400);
      }
    }, {
      // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    })
    console.log("Initiate Request: ", {
      bankAccountNumber: body.iban,
      bankCode: body.bankCode,
      amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
      receiverMSISDN: body.phone,
      referenceId: id
    })

    let payload = encryptData(
      {
        bankAccountNumber: body.iban,
        bankCode: body.bankCode,
        amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
        receiverMSISDN: body.phone,
        referenceId: id
      }
      , findDisbureMerch.key, findDisbureMerch.initialVector)
    let db_id = id;
    let requestData = {
      data: payload,
    };
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    let response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-i`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    let data;
    if (!res.data) {
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      await prisma.disbursement.create({
        data: {
          ...data2,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: new Date(),
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.iban,
          provider: PROVIDERS.JAZZ_CASH,
          status: "pending",
          response_message: "pending",
          to_provider: body.bankCode
        },
      });
      balanceDeducted = false;
      throw new CustomError("Transaction is Pending", 202);
    }
    data = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    console.log("Initiate Response: ", data)
    if (data.responseCode != "G2P-T-0") {
      console.log("IBFT Response: ", data);
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      data2["transaction_id"] = data.transactionID || db_id;
      // Get the current date
      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.create({
        data: {
          ...data2,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: zonedDate,
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.iban,
          provider: PROVIDERS.BANK,
          status: "failed",
          response_message: data.responseDescription
        },
      });
      balanceDeducted = false;
      throw new CustomError(data.responseDescription, 500)
    }

    id = transactionService.createTransactionId();
    console.log("Confirm Request: ", {
      "Init_transactionID": data.transactionID,
      "referenceID": id
    })

    payload = encryptData({
      "Init_transactionID": data.transactionID,
      "referenceID": id
    }, findDisbureMerch.key, findDisbureMerch.initialVector)

    requestData = {
      data: payload
    };
    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-t`, {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    res = await response.json();
    if (!res.data) {
      easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      await prisma.disbursement.create({
        data: {
          ...data2,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: new Date(),
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.iban,
          provider: PROVIDERS.JAZZ_CASH,
          status: "pending",
          response_message: "pending",
          to_provider: body.bankCode
        },
      });
      balanceDeducted = false;
      throw new CustomError("Transaction is Pending", 202);
    }
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    // let res = {responseCode: "G2P-T-1",transactionID: "", responseDescription: "Failed"}
    if (res.responseCode != "G2P-T-0") {
      console.log("IBFT Response: ", data);
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      data2["transaction_id"] = res.transactionID || db_id;
      // Get the current date
      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.create({
        data: {
          ...data2,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: zonedDate,
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.iban,
          provider: PROVIDERS.BANK,
          status: "failed",
          response_message: res.responseDescription
        },
      });
      balanceDeducted = false;
      throw new CustomError(res.responseDescription, 500)
    }
    return await prisma.$transaction(
      async (tx) => {
        // Update transactions to adjust balances
        data2["transaction_id"] = res.transactionID;
        // }
        // Get the current date
        const date = new Date();

        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';

        // Convert the date to the Pakistan timezone
        const zonedDate = toZonedTime(date, timeZone);
        // Create disbursement record
        let disbursement = await tx.disbursement.create({
          data: {
            ...data2,
            // transaction_id: id,
            merchant_id: Number(findMerchant.merchant_id),
            disbursementDate: zonedDate,
            transactionAmount: amountDecimal,
            commission: totalCommission,
            gst: totalGST,
            withholdingTax: totalWithholdingTax,
            merchantAmount: body.amount ? body.amount : merchantAmount,
            platform: 0,
            account: body.iban,
            provider: PROVIDERS.BANK,
            status: "completed",
            response_message: "success"
          },
        });
        let webhook_url: string;
        if (findMerchant.callback_mode == "DOUBLE") {
          webhook_url = findMerchant.payout_callback as string;
        }
        else {
          webhook_url = findMerchant.webhook_url as string;
        }
        transactionService.sendCallback(
          webhook_url,
          {
            original_amount: body.amount ? body.amount : merchantAmount,
            date_time: zonedDate,
            merchant_transaction_id: disbursement.merchant_custom_order_id,
            merchant_id: findMerchant.merchant_id
          },
          body.phone,
          "payout",
          stringToBoolean(findMerchant.encrypted as string),
          false
        );

        return {
          message: "Disbursement created successfully",
          merchantAmount: body.amount
            ? body.amount.toString()
            : merchantAmount.toString(),
          order_id: disbursement.merchant_custom_order_id,
          externalApiResponse: {
            TransactionReference: disbursement.merchant_custom_order_id,
            TransactionStatus: "success",
          },
        };
      }, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    }
    );
  }
  catch (err: any) {
    console.log("Initiate Transaction Error", err);
    if (balanceDeducted) {
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);

    }
    throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
  }
}

async function initiateTransactionClone(token: string, body: any, merchantId: string) {
  let findMerchant: any;
  let walletBalance;
  let totalDisbursed: number | Decimal = new Decimal(0);
  let balanceDeducted = false;
  let merchantAmount: Decimal = new Decimal(0);
  let id = '';
  try {
    console.log(JSON.stringify({ event: "IBFT_TRANSACTION_REQUEST", order_id: body.order_id, body: body }))
    // validate Merchant
    findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    let balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
    walletBalance = balance.walletBalance;

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    if (body.order_id) {
      const checkOrder = await prisma.disbursement.findFirst({
        where: {
          merchant_custom_order_id: body.order_id,
        },
      });
      if (checkOrder) {
        throw new CustomError("Order ID already exists", 400);
      }
    }
    let totalCommission: Decimal = new Decimal(0);
    let totalGST: Decimal = new Decimal(0);
    let totalWithholdingTax: Decimal = new Decimal(0);
    let amountDecimal: Decimal = new Decimal(body.amount);
    merchantAmount = new Decimal(body.amount);
    totalDisbursed = new Decimal(0);
    id = transactionService.createTransactionId();
    let data2: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string; } = {};
    if (body.order_id) {
      data2["merchant_custom_order_id"] = body.order_id;
    }
    else {
      data2["merchant_custom_order_id"] = id;
    }
    data2["system_order_id"] = id;
    await prisma.$transaction(async (tx) => {
      try {
        let rate = await getMerchantRate(tx, findMerchant.merchant_id);

        // Calculate total deductions and merchant amount
        totalCommission = amountDecimal.mul(rate.disbursementRate);
        totalGST = amountDecimal.mul(rate.disbursementGST);
        totalWithholdingTax = amountDecimal.mul(
          rate.disbursementWithHoldingTax
        );
        const totalDeductions = totalCommission
          .plus(totalGST)
          .plus(totalWithholdingTax);
        merchantAmount = body.amount
          ? amountDecimal.plus(totalDeductions)
          : amountDecimal.minus(totalDeductions);

        // Get eligible transactions
        if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
          throw new CustomError("Insufficient balance to disburse", 400);
        }
        const result = await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, false);
        balanceDeducted = true;
        console.log(JSON.stringify({ event: "BALANCE_ADJUSTED", merchantId, deductedAmount: merchantAmount.toString(), id: id, order_id: body.order_id }));
      }
      catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === 'P2034') {
            await prisma.disbursement.create({
              data: {
                ...data2,
                // transaction_id: id,
                merchant_id: Number(findMerchant.merchant_id),
                disbursementDate: new Date(),
                transactionAmount: amountDecimal,
                commission: totalCommission,
                gst: totalGST,
                withholdingTax: totalWithholdingTax,
                merchantAmount: body.amount ? body.amount : merchantAmount,
                platform: 0,
                account: body.iban,
                provider: PROVIDERS.JAZZ_CASH,
                status: "pending",
                response_message: "pending",
                to_provider: body.bankCode,
                // providerDetails: {
                //   id: findMerchant?.JazzCashDisburseAccountId
                // }
                providerDetails: {
                  id: findMerchant?.JazzCashDisburseAccountId,
                  bank_name: body.bankName,
                  sub_name: PROVIDERS.JAZZ_CASH
                }
              },
            });
            throw new CustomError("Transaction is Pending", 202);
          }
        }
        throw new CustomError("Not Enough Balance", 400);
      }
    }, {
      // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    })


    // let payload = encryptData(
    //   {
    //     bankAccountNumber: body.iban,
    //     bankCode: body.bankCode,
    //     amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
    //     receiverMSISDN: "03123456789",
    //     referenceId: id
    //   }
    //   , findDisbureMerch.key, findDisbureMerch.initialVector)
    let payload = encryptData(
      {
        bankAccountNumber: body.iban,
        bankCode: body.bankCode, // ✅ verified & mapped
        amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
        receiverMSISDN: "03123456789",
        referenceId: id
      },
      findDisbureMerch.key,
      findDisbureMerch.initialVector
    );


    let db_id = id;
    let requestData = {
      data: payload,
    };
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    
    let response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-i`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    let data;
    if (!res.data) {
      console.log(JSON.stringify({ event: "IBFT_INQUIRY_DATA_NOT_RECIEVED", response: res, id, order_id: body.order_id }))
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      await prisma.disbursement.create({
        data: {
          ...data2,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: new Date(),
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.iban,
          provider: PROVIDERS.JAZZ_CASH,
          status: "pending",
          response_message: "pending",
          to_provider: body.bankCode,
          // providerDetails: {
          //   id: findMerchant?.JazzCashDisburseAccountId
          // }
          providerDetails: {
            id: findMerchant?.JazzCashDisburseAccountId,
            bank_name: body.bankName,
            sub_name: PROVIDERS.JAZZ_CASH
          }
        },
      });
      balanceDeducted = false;
      throw new CustomError("Transaction is Pending", 202);
    }
    data = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    console.log(JSON.stringify({ event: "IBFT_INQUIRY_SUCCESS", response: data, order_id: body.order_id }))
    // console.log("Initiate Response: ", data)
    if (data.responseCode != "G2P-T-0") {
      console.log(JSON.stringify({ event: "IBFT_INQUIRY_ERROR", response: data, id, order_id: body.order_id }))
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      data2["transaction_id"] = data.transactionID || db_id;
      // Get the current date
      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.create({
        data: {
          ...data2,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: zonedDate,
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.iban,
          provider: PROVIDERS.BANK,
          status: "failed",
          response_message: data.responseDescription,
          // providerDetails: {
          //   id: findMerchant?.JazzCashDisburseAccountId,
          //   sub_name: PROVIDERS.JAZZ_CASH
          // }
          providerDetails: {
            id: findMerchant?.JazzCashDisburseAccountId,
            bank_name: body.bankName,
            sub_name: PROVIDERS.JAZZ_CASH
          }
        },
      });
      balanceDeducted = false;
      throw new CustomError(data.responseDescription, 500)
    }

    id = transactionService.createTransactionId();
    console.log("Confirm Request: ", {
      "Init_transactionID": data.transactionID,
      "referenceID": id
    })

    payload = encryptData({
      "Init_transactionID": data.transactionID,
      "referenceID": id
    }, findDisbureMerch.key, findDisbureMerch.initialVector)
    console.log(JSON.stringify({ event: "TRANSACTION_CONFIRMED", initTransactionID: data.transactionID, referenceID: id, order_id: body.order_id, id }));
    requestData = {
      data: payload
    };
    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    
    response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-t`, {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    res = await response.json();
    if (!res.data) {
      console.log(JSON.stringify({ event: "IBFT_PAYMENT_DATA_NOT_RECIEVED", response: res, id, order_id: body.order_id }))
      easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      await prisma.disbursement.create({
        data: {
          ...data2,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: new Date(),
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.iban,
          provider: PROVIDERS.JAZZ_CASH,
          status: "pending",
          response_message: "pending",
          to_provider: body.bankCode,
          // providerDetails: {
          //   id: findMerchant?.JazzCashDisburseAccountId,
          // }
          providerDetails: {
            id: findMerchant?.JazzCashDisburseAccountId,
            bank_name: body.bankName,
            sub_name: PROVIDERS.JAZZ_CASH
          }

        },
      });
      balanceDeducted = false;
      throw new CustomError("Transaction is Pending", 202);
    }
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    console.log(JSON.stringify({ event: "IBFT_PAYMENT_SUCCESS", response: data, order_id: body.order_id }))
    // let res = {responseCode: "G2P-T-1",transactionID: "", responseDescription: "Failed"}
    if (res.responseCode != "G2P-T-0") {
      // console.log("IBFT Response: ", data);
      console.log(JSON.stringify({ event: "IBFT_PAYMENT_ERROR", response: res, id, order_id: body.order_id }))
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      data2["transaction_id"] = res.transactionID || db_id;
      // Get the current date
      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.create({
        data: {
          ...data2,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: zonedDate,
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.iban,
          provider: PROVIDERS.BANK,
          status: "failed",
          response_message: res.responseDescription,
          // providerDetails: {
          //   id: findMerchant?.JazzCashDisburseAccountId,
          //   sub_name: PROVIDERS.JAZZ_CASH


          // }
        to_provider: body.bankCode,
         providerDetails: {
            id: findMerchant?.JazzCashDisburseAccountId,
            bank_name: body.bankName,
            sub_name: PROVIDERS.JAZZ_CASH
          }
        },
      });
      balanceDeducted = false;
      throw new CustomError(res.responseDescription, 500)
    }

    console.log(JSON.stringify({ event: "TRANSACTION_SUCCESS", transactionId: res.transactionID, merchantId, finalAmount: merchantAmount.toString(), id, order_id: body.order_id }));
    return await prisma.$transaction(
      async (tx) => {
        // Update transactions to adjust balances
        data2["transaction_id"] = res.transactionID;
        // }
        // Get the current date
        const date = new Date();

        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';

        // Convert the date to the Pakistan timezone
        const zonedDate = toZonedTime(date, timeZone);
        // Create disbursement record
        let disbursement = await tx.disbursement.create({
          data: {
            ...data2,
            // transaction_id: id,
            merchant_id: Number(findMerchant.merchant_id),
            disbursementDate: zonedDate,
            transactionAmount: amountDecimal,
            commission: totalCommission,
            gst: totalGST,
            withholdingTax: totalWithholdingTax,
            merchantAmount: body.amount ? body.amount : merchantAmount,
            platform: 0,
            account: body.iban,
            provider: PROVIDERS.BANK,
            status: "completed",
            response_message: "success",
            // providerDetails: {
            //   id: findMerchant?.JazzCashDisburseAccountId,
            //   sub_name: PROVIDERS.JAZZ_CASH
            // }
            to_provider: body.bankCode,
            providerDetails: {
              id: findMerchant?.JazzCashDisburseAccountId,
              bank_name: body.bankName,
              sub_name: PROVIDERS.JAZZ_CASH
            }

          },
        });
        let webhook_url: string;
        if (findMerchant.callback_mode == "DOUBLE") {
          webhook_url = findMerchant.payout_callback as string;
        }
        else {
          webhook_url = findMerchant.webhook_url as string;
        }
        transactionService.sendCallback(
          webhook_url,
          {
            original_amount: body.amount ? body.amount : merchantAmount,
            date_time: zonedDate,
            merchant_transaction_id: disbursement.merchant_custom_order_id,
            merchant_id: findMerchant.merchant_id
          },
          body.phone,
          "payout",
          stringToBoolean(findMerchant.encrypted as string),
          false
        );
        console.log(JSON.stringify({
          event: "IBFT_TRANSACTION_RESPONSE", order_id: body.order_id, response: {
            message: "Disbursement created successfully",
            merchantAmount: body.amount
              ? body.amount.toString()
              : merchantAmount.toString(),
            order_id: disbursement.merchant_custom_order_id,
            externalApiResponse: {
              TransactionReference: disbursement.merchant_custom_order_id,
              TransactionStatus: "success",
            },
          }
        }))
        return {
          message: "Disbursement created successfully",
          merchantAmount: body.amount
            ? body.amount.toString()
            : merchantAmount.toString(),
          order_id: disbursement.merchant_custom_order_id,
          externalApiResponse: {
            TransactionReference: res.transactionID || data2.transaction_id,
            TransactionStatus: "success",
          },
        };
      }, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    }
    );
  }
  catch (err: any) {
    // console.log("Initiate Transaction Error", err);
    console.log(JSON.stringify({ event: "TRANSACTION_ERROR", errorMessage: err?.message, statusCode: err?.statusCode || 500, id, order_id: body.order_id }));
    if (balanceDeducted) {
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
    }
    throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
  }
}

async function simpleSandboxinitiateTransactionClone(token: string, body: any, merchantId: string) {
  let findMerchant: any;
  let walletBalance;
  let totalDisbursed: number | Decimal = new Decimal(0);
  let obj: any = {};
  try {
    // validate Merchant
    findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    let balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
    walletBalance = balance.walletBalance;
    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    if (body.order_id) {
      const checkOrder = await prisma.disbursement.findFirst({
        where: {
          merchant_custom_order_id: body.order_id,
        },
      });
      if (checkOrder) {
        throw new CustomError("Order ID already exists", 400);
      }
    }

    let id = transactionService.createTransactionId();

    obj["inquiry_request"] = {
      bankAccountNumber: body.iban,
      bankCode: body.bankCode,
      amount: body.amount,
      receiverMSISDN: body.phone,
      referenceId: id
    }
    console.log("Initiate Request: ", {
      bankAccountNumber: body.iban,
      bankCode: body.bankCode,
      amount: body.amount,
      receiverMSISDN: body.phone,
      referenceId: id
    })

    let payload = encryptData(
      {
        bankAccountNumber: body.iban,
        bankCode: body.bankCode,
        amount: body.amount,
        receiverMSISDN: body.phone,
        referenceId: id
      }
      , findDisbureMerch.key, findDisbureMerch.initialVector)
    let db_id = id;
    let requestData = {
      data: payload,
    };
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    let response = await fetch(`https://jazz-sandbox.sahulatpay.com/sjzd-ibft-i`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    let data;
    if (!res.data) {
      obj["inquiry_response"] = res;
      return obj;
      // await prisma.disbursement.create({
      //   data: {
      //     ...data2,
      //     // transaction_id: id,
      //     merchant_id: Number(findMerchant.merchant_id),
      //     disbursementDate: new Date(),
      //     transactionAmount: amountDecimal,
      //     commission: totalCommission,
      //     gst: totalGST,
      //     withholdingTax: totalWithholdingTax,
      //     merchantAmount: body.amount ? body.amount : merchantAmount,
      //     platform: 0,
      //     account: body.iban,
      //     provider: PROVIDERS.JAZZ_CASH,
      //     status: "pending",
      //     response_message: "pending",
      //     to_provider: body.bankCode
      //   },
      // });
      // throw new CustomError("Transaction is Pending", 202);
    }
    data = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    console.log("Initiate Response: ", data)
    if (data.responseCode != "G2P-T-0") {
      console.log("IBFT Response: ", data);
      obj["inquiry_response"] = data;
      return obj
      // throw new CustomError(data.responseDescription, 500)
    }
    obj["inquiry_response"] = data;

    id = transactionService.createTransactionId();
    obj["payment_request"] = {
      "Init_transactionID": data.transactionID,
      "referenceID": id
    }
    console.log("Confirm Request: ", {
      "Init_transactionID": data.transactionID,
      "referenceID": id
    })

    payload = encryptData({
      "Init_transactionID": data.transactionID,
      "referenceID": id
    }, findDisbureMerch.key, findDisbureMerch.initialVector)

    requestData = {
      data: payload
    };
    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    response = await fetch(`https://jazz-sandbox.sahulatpay.com/sjzd-ibft-t`, {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    res = await response.json();
    if (!res.data) {
      obj["payment_response"] = res;
      return obj;
      // await prisma.disbursement.create({
      //   data: {
      //     ...data2,
      //     // transaction_id: id,
      //     merchant_id: Number(findMerchant.merchant_id),
      //     disbursementDate: new Date(),
      //     transactionAmount: amountDecimal,
      //     commission: totalCommission,
      //     gst: totalGST,
      //     withholdingTax: totalWithholdingTax,
      //     merchantAmount: body.amount ? body.amount : merchantAmount,
      //     platform: 0,
      //     account: body.iban,
      //     provider: PROVIDERS.JAZZ_CASH,
      //     status: "pending",
      //     response_message: "pending",
      //     to_provider: body.bankCode
      //   },
      // });
      // throw new CustomError("Transaction is Pending", 202);
    }
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    // let res = {responseCode: "G2P-T-1",transactionID: "", responseDescription: "Failed"}
    if (res.responseCode != "G2P-T-0") {
      console.log("IBFT Response: ", data);
      obj["payment_response"] = res;
      return obj;
      // throw new CustomError(res.responseDescription, 500)
    }
    obj["payment_response"] = res;
    return obj;
    // return res;
  }
  catch (err: any) {
    console.log("Initiate Transaction Error", err);
    throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
  }
}

async function simpleProductionInitiateTransactionClone(token: string, body: any, merchantId: string) {
  let findMerchant: any;
  let walletBalance;
  let totalDisbursed: number | Decimal = new Decimal(0);
  let obj: any = {};
  try {
    // validate Merchant
    findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    let balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
    walletBalance = balance.walletBalance;
    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    if (body.order_id) {
      const checkOrder = await prisma.disbursement.findFirst({
        where: {
          merchant_custom_order_id: body.order_id,
        },
      });
      if (checkOrder) {
        throw new CustomError("Order ID already exists", 400);
      }
    }

    let id = transactionService.createTransactionId();

    obj["inquiry_request"] = {
      bankAccountNumber: body.iban,
      bankCode: body.bankCode,
      amount: body.amount,
      receiverMSISDN: body.phone,
      referenceId: id
    }
    console.log("Initiate Request: ", {
      bankAccountNumber: body.iban,
      bankCode: body.bankCode,
      amount: body.amount,
      receiverMSISDN: body.phone,
      referenceId: id
    })

    let payload = encryptData(
      {
        bankAccountNumber: body.iban,
        bankCode: body.bankCode,
        amount: body.amount,
        receiverMSISDN: body.phone,
        referenceId: id
      }
      , findDisbureMerch.key, findDisbureMerch.initialVector)
    let db_id = id;
    let requestData = {
      data: payload,
    };
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    let response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-i`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    let data;
    if (!res.data) {
      obj["inquiry_response"] = res;
      return obj;
      // await prisma.disbursement.create({
      //   data: {
      //     ...data2,
      //     // transaction_id: id,
      //     merchant_id: Number(findMerchant.merchant_id),
      //     disbursementDate: new Date(),
      //     transactionAmount: amountDecimal,
      //     commission: totalCommission,
      //     gst: totalGST,
      //     withholdingTax: totalWithholdingTax,
      //     merchantAmount: body.amount ? body.amount : merchantAmount,
      //     platform: 0,
      //     account: body.iban,
      //     provider: PROVIDERS.JAZZ_CASH,
      //     status: "pending",
      //     response_message: "pending",
      //     to_provider: body.bankCode
      //   },
      // });
      // throw new CustomError("Transaction is Pending", 202);
    }
    data = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    console.log("Initiate Response: ", data)
    if (data.responseCode != "G2P-T-0") {
      console.log("IBFT Response: ", data);
      obj["inquiry_response"] = data;
      return obj
      // throw new CustomError(data.responseDescription, 500)
    }
    obj["inquiry_response"] = data;

    id = transactionService.createTransactionId();
    obj["payment_request"] = {
      "Init_transactionID": data.transactionID,
      "referenceID": id
    }
    console.log("Confirm Request: ", {
      "Init_transactionID": data.transactionID,
      "referenceID": id
    })

    payload = encryptData({
      "Init_transactionID": data.transactionID,
      "referenceID": id
    }, findDisbureMerch.key, findDisbureMerch.initialVector)

    requestData = {
      data: payload
    };
    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-t`, {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    res = await response.json();
    if (!res.data) {
      obj["payment_response"] = res;
      return obj;
      // await prisma.disbursement.create({
      //   data: {
      //     ...data2,
      //     // transaction_id: id,
      //     merchant_id: Number(findMerchant.merchant_id),
      //     disbursementDate: new Date(),
      //     transactionAmount: amountDecimal,
      //     commission: totalCommission,
      //     gst: totalGST,
      //     withholdingTax: totalWithholdingTax,
      //     merchantAmount: body.amount ? body.amount : merchantAmount,
      //     platform: 0,
      //     account: body.iban,
      //     provider: PROVIDERS.JAZZ_CASH,
      //     status: "pending",
      //     response_message: "pending",
      //     to_provider: body.bankCode
      //   },
      // });
      // throw new CustomError("Transaction is Pending", 202);
    }
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    // let res = {responseCode: "G2P-T-1",transactionID: "", responseDescription: "Failed"}
    if (res.responseCode != "G2P-T-0") {
      console.log("IBFT Response: ", data);
      obj["payment_response"] = res;
      return obj;
      // throw new CustomError(res.responseDescription, 500)
    }
    obj["payment_response"] = res;
    return obj;
    // return res;
  }
  catch (err: any) {
    console.log("Initiate Transaction Error", err);
    throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
  }
}

async function updateTransaction(token: string, body: UpdateDisbursementPayload, merchantId: string) {
  let findMerchant: any;
  let walletBalance;
  let totalDisbursed: number | Decimal = new Decimal(0);
  let balanceDeducted = false;
  let merchantAmount: Decimal = new Decimal(+body.merchantAmount + +body.commission + +body.gst + +body.withholdingTax);
  try {
    // validate Merchant
    findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    let balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
    walletBalance = balance.walletBalance;
    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    if (body.order_id) {
      const checkOrder = await prisma.disbursement.findFirst({
        where: {
          merchant_custom_order_id: body.order_id,
        },
      });
      if (checkOrder) {
        throw new CustomError("Order ID already exists", 400);
      }
    }
    let amountDecimal: Decimal = new Decimal(0);
    totalDisbursed = new Decimal(0);
    let data2: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string } = {};
    data2["merchant_custom_order_id"] = body.merchant_custom_order_id;
    data2["system_order_id"] = body.system_order_id;
    await prisma.$transaction(async (tx) => {
      try {
        let rate = await getMerchantRate(tx, findMerchant.merchant_id);
        console.log(`Merchant Amount: ${body.merchantAmount} + ${body.commission} + ${body.gst} + ${body.withholdingTax} = ${merchantAmount}`)
        if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
          await prisma.disbursement.update({
            where: {
              merchant_custom_order_id: data2.merchant_custom_order_id
            },
            data: {
              transaction_id: data2.system_order_id,
              status: "failed",
              response_message: "Not Enough Balance",
              provider: PROVIDERS.BANK
            },
          });
          throw new CustomError("Insufficient balance to disburse", 400);
        }
        const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, false);
        balanceDeducted = true;
      }
      catch (err: any) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === 'P2034') {
            throw new CustomError("Transaction is Pending", 202);
          }
        }
        throw new CustomError("Not Enough Balance", 400);
      }
    }, {
      // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    })
    console.log("Initiate Request: ", {
      bankAccountNumber: body.account,
      bankCode: body.to_provider,
      amount: body.merchantAmount ? formatAmount(+body.merchantAmount) : formatAmount(+merchantAmount),
      receiverMSISDN: "03142304891",
      referenceId: body.system_order_id
    })

    let payload = encryptData(
      {
        bankAccountNumber: body.account,
        bankCode: body.to_provider,
        amount: body.merchantAmount ? formatAmount(+body.merchantAmount) : formatAmount(+merchantAmount),
        receiverMSISDN: "03142304891",
        referenceId: body.system_order_id
      }
      , findDisbureMerch.key, findDisbureMerch.initialVector)
    let db_id = body.system_order_id;
    let requestData = {
      data: payload,
    };
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    let response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-i`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    let data;
    if (!res.data) {
      const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      balanceDeducted = false;
      throw new CustomError("Transaction is Pending", 202);
    }
    data = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    console.log("Initiate Response: ", data)
    if (data.responseCode != "G2P-T-0") {
      console.log("IBFT Response: ", data);
      const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      balanceDeducted = false;
      data2["transaction_id"] = data.transactionID || body.system_order_id;
      // Get the current date
      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.update({
        where: {
          merchant_custom_order_id: data2.merchant_custom_order_id
        },
        data: {
          transaction_id: data2.transaction_id,
          status: "failed",
          response_message: data.responseDescription,
          provider: PROVIDERS.BANK
        },
      });
      throw new CustomError(data.responseDescription, 500)
    }

    let id = transactionService.createTransactionId();
    console.log("Confirm Request: ", {
      "Init_transactionID": data.transactionID,
      "referenceID": id
    })

    payload = encryptData({
      "Init_transactionID": data.transactionID,
      "referenceID": id
    }, findDisbureMerch.key, findDisbureMerch.initialVector)

    requestData = {
      data: payload
    };
    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-t`, {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    res = await response.json();
    if (!res.data) {
      const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      balanceDeducted = false;
      throw new CustomError("Transaction is Pending", 202);
    }
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    // let res = {responseCode: "G2P-T-1",transactionID: "", responseDescription: "Failed"}
    if (res.responseCode != "G2P-T-0") {
      console.log("IBFT Response: ", data);
      const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      balanceDeducted = false;
      data2["transaction_id"] = res.transactionID || body.system_order_id;
      // Get the current date
      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.update({
        where: {
          merchant_custom_order_id: body.merchant_custom_order_id,
        },
        data: {
          transaction_id: data2.transaction_id,
          status: "failed",
          response_message: res.responseDescription,
          provider: PROVIDERS.BANK
        },
      });
      throw new CustomError(res.responseDescription, 500)
    }
    return await prisma.$transaction(
      async (tx) => {
        // Update transactions to adjust balances

        data2["transaction_id"] = res.transactionID;
        // }
        // Get the current date
        const date = new Date();

        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';

        // Convert the date to the Pakistan timezone
        const zonedDate = toZonedTime(date, timeZone);
        // Create disbursement record
        let disbursement = await tx.disbursement.update({
          where: {
            merchant_custom_order_id: body.merchant_custom_order_id
          },
          data: {
            transaction_id: data2.transaction_id,
            status: "completed",
            response_message: "success",
            provider: PROVIDERS.BANK
          },
        });
        let webhook_url: string;
        if (findMerchant.callback_mode == "DOUBLE") {
          webhook_url = findMerchant.payout_callback as string;
        }
        else {
          webhook_url = findMerchant.webhook_url as string;
        }
        transactionService.sendCallback(
          webhook_url,
          {
            original_amount: body.merchantAmount ? body.merchantAmount : merchantAmount,
            date_time: zonedDate,
            merchant_transaction_id: disbursement.merchant_custom_order_id,
            merchant_id: findMerchant.merchant_id
          },
          body.account,
          "payout",
          stringToBoolean(findMerchant.encrypted as string),
          false
        );

        return {
          message: "Disbursement created successfully",
          merchantAmount: body.merchantAmount
            ? body.merchantAmount.toString()
            : merchantAmount.toString(),
          order_id: disbursement.merchant_custom_order_id,
          externalApiResponse: {
            TransactionReference: disbursement.merchant_custom_order_id,
            TransactionStatus: "success",
          },
        };
      }, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    }
    );
  }
  catch (err: any) {
    console.log("Initiate Transaction Error", err);
    if (balanceDeducted) {
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
    }
    throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
  }
}

async function updateTransactionClone(token: string, body: UpdateDisbursementPayload, merchantId: string) {
  let findMerchant: any;
  let walletBalance;
  let totalDisbursed: number | Decimal = new Decimal(0);
  let balanceDeducted = false;
  let merchantAmount: Decimal = new Decimal(+body.merchantAmount + +body.commission + +body.gst + +body.withholdingTax);
  try {
    console.log(JSON.stringify({ event: "IBFT_PENDING_REQUEST", order_id: body.order_id, body }))
    // validate Merchant
    findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    let balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
    walletBalance = balance.walletBalance;
    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    if (body.order_id) {
      const checkOrder = await prisma.disbursement.findFirst({
        where: {
          merchant_custom_order_id: body.order_id,
        },
      });
      if (checkOrder) {
        console.log(JSON.stringify({ event: "ORDER_ID_EXISTS", order_id: body.order_id }))
        throw new CustomError("Order ID already exists", 400);
      }
    }
    let amountDecimal: Decimal = new Decimal(0);
    totalDisbursed = new Decimal(0);
    let data2: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string } = {};
    let id = transactionService.createTransactionId();
    data2["merchant_custom_order_id"] = body.merchant_custom_order_id;
    data2["system_order_id"] = id;
    await prisma.$transaction(async (tx) => {
      try {
        let rate = await getMerchantRate(tx, findMerchant.merchant_id);
        console.log(`Merchant Amount: ${body.merchantAmount} + ${body.commission} + ${body.gst} + ${body.withholdingTax} = ${merchantAmount}`)
        if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
          await prisma.disbursement.update({
            where: {
              merchant_custom_order_id: data2.merchant_custom_order_id
            },
            data: {
              transaction_id: data2.system_order_id,
              status: "failed",
              response_message: "Not Enough Balance",
              provider: PROVIDERS.BANK
            },
          });
          console.log(JSON.stringify({ event: "INSUFFICIENT_BALANCE_TO_DISBURSE", order_id: body.order_id }))
          throw new CustomError("Insufficient balance to disburse", 400);
        }
        console.log(JSON.stringify({ event: "IBFT_BALANCE_ADJUSTED", order_id: body.order_id }))
        const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, false);
        balanceDeducted = true;
      }
      catch (err: any) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === 'P2034') {
            throw new CustomError("Transaction is Pending", 202);
          }
        }
        throw new CustomError("Not Enough Balance", 400);
      }
    }, {
      // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    })
    console.log("Initiate Request: ", {
      bankAccountNumber: body.account,
      bankCode: body.to_provider,
      amount: body.merchantAmount ? formatAmount(+body.merchantAmount) : formatAmount(+merchantAmount),
      receiverMSISDN: "03142304891",
      referenceId: id
    })

    let payload = encryptData(
      {
        bankAccountNumber: body.account,
        bankCode: body.to_provider,
        amount: body.merchantAmount ? formatAmount(+body.merchantAmount) : formatAmount(+merchantAmount),
        receiverMSISDN: "03142304891",
        referenceId: id
      }
      , findDisbureMerch.key, findDisbureMerch.initialVector)
    let db_id = id;
    let requestData = {
      data: payload,
    };
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    let response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-i`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    let data;
    if (!res.data) {
      console.log(JSON.stringify({ event: "IBFT_PENDING_REQUEST", order_id: body.order_id, response: res }))
      const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      balanceDeducted = false;
      throw new CustomError("Transaction is Pending", 202);
    }
    data = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    console.log("Initiate Response: ", data)
    if (data.responseCode != "G2P-T-0") {
      console.log(JSON.stringify({ event: "IBFT_PENDING_FAILED", order_id: body.order_id, response: data }))
      console.log("IBFT Response: ", data);
      const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      balanceDeducted = false;
      data2["transaction_id"] = data.transactionID || body.system_order_id;
      // Get the current date
      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.update({
        where: {
          merchant_custom_order_id: data2.merchant_custom_order_id
        },
        data: {
          system_order_id: data2["system_order_id"],
          transaction_id: data2.transaction_id,
          status: "failed",
          response_message: data.responseDescription,
          provider: PROVIDERS.BANK
        },
      });
      throw new CustomError(data.responseDescription, 500)
    }
    id = transactionService.createTransactionId();
    // data2["system_order_id"] = id;
    console.log("Confirm Request: ", {
      "Init_transactionID": data.transactionID,
      "referenceID": id
    })

    payload = encryptData({
      "Init_transactionID": data.transactionID,
      "referenceID": id
    }, findDisbureMerch.key, findDisbureMerch.initialVector)

    requestData = {
      data: payload
    };
    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
    response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ibft-t`, {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    res = await response.json();
    if (!res.data) {
      console.log(JSON.stringify({ event: "IBFT_PENDING_REQUEST", order_id: body.order_id, response: res }))
      const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      balanceDeducted = false;
      throw new CustomError("Transaction is Pending", 202);
    }
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    // let res = {responseCode: "G2P-T-1",transactionID: "", responseDescription: "Failed"}
    if (res.responseCode != "G2P-T-0") {
      console.log(JSON.stringify({ event: "IBFT_PENDING_FAILED", order_id: body.order_id, response: res }))
      console.log("IBFT Response: ", data);
      const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      balanceDeducted = false;
      data2["transaction_id"] = res.transactionID || body.system_order_id;
      // Get the current date
      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.update({
        where: {
          merchant_custom_order_id: body.merchant_custom_order_id,
        },
        data: {
          system_order_id: data2["system_order_id"],
          transaction_id: data2.transaction_id,
          status: "failed",
          response_message: res.responseDescription,
          provider: PROVIDERS.BANK
        },
      });
      throw new CustomError(res.responseDescription, 500)
    }
    return await prisma.$transaction(
      async (tx) => {
        // Update transactions to adjust balances

        data2["transaction_id"] = res.transactionID;
        // }
        // Get the current date
        const date = new Date();

        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';

        // Convert the date to the Pakistan timezone
        const zonedDate = toZonedTime(date, timeZone);
        // Create disbursement record
        let disbursement = await tx.disbursement.update({
          where: {
            merchant_custom_order_id: body.merchant_custom_order_id
          },
          data: {
            system_order_id: data2["system_order_id"],
            transaction_id: data2.transaction_id,
            status: "completed",
            response_message: "success",
            provider: PROVIDERS.BANK
          },
        });
        let webhook_url: string;
        if (findMerchant.callback_mode == "DOUBLE") {
          webhook_url = findMerchant.payout_callback as string;
        }
        else {
          webhook_url = findMerchant.webhook_url as string;
        }
        transactionService.sendCallback(
          webhook_url,
          {
            original_amount: body.merchantAmount ? body.merchantAmount : merchantAmount,
            date_time: zonedDate,
            merchant_transaction_id: disbursement.merchant_custom_order_id,
            merchant_id: findMerchant.merchant_id
          },
          body.account,
          "payout",
          stringToBoolean(findMerchant.encrypted as string),
          false
        );
        console.log(JSON.stringify({
          event: "IBFT_PENDING_RESPONSE", order_id: body.order_id, response: {
            message: "Disbursement created successfully",
            merchantAmount: body.merchantAmount
              ? body.merchantAmount.toString()
              : merchantAmount.toString(),
            order_id: disbursement.merchant_custom_order_id,
            externalApiResponse: {
              TransactionReference: disbursement.merchant_custom_order_id,
              TransactionStatus: "success",
            },
          }
        }))
        return {
          message: "Disbursement created successfully",
          merchantAmount: body.merchantAmount
            ? body.merchantAmount.toString()
            : merchantAmount.toString(),
          order_id: disbursement.merchant_custom_order_id,
          externalApiResponse: {
            TransactionReference: disbursement.merchant_custom_order_id,
            TransactionStatus: "success",
          },
        };
      }, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    }
    );
  }
  catch (err: any) {
    console.log("Initiate Transaction Error", err);
    if (balanceDeducted) {
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
    }
    throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
  }
}

// async function confirmTransaction(token) {
//   const requestData = {
//     data: '77052900041f7ca111e5f08e4e44f082cb23ae9b9fb34c823781bc848eecc1d331bc4500292285ff6d6467711daf27e6fd8bdd7f300c6d29ef299aac0a0a54926e38aa46031bb24d2498a3559f79bb98d5c818e2da027a6819666ba0212cf6f5'
//   };

//   const response = await fetch(`${baseUrl}/jazzcash/third-party-integration/srv3/api/wso2/ibft/payment`, {
//     method: 'POST',
//     headers: {
//       'Accept': 'application/json',
//       'Authorization': `Bearer ${token}`,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify(requestData)
//   });
//   return await response.json();
// }

// async function mwTransaction(token: string, body: any, merchantId: string) {
//   let findMerchant: any;
//   let walletBalance;
//   let totalDisbursed: number | Decimal = new Decimal(0);
//   try {
//     // validate Merchant
//     findMerchant = await merchantService.findOne({
//       uid: merchantId,
//     });
//     const balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
//     walletBalance = balance.walletBalance; // Get the wallet balance
//     if (!findMerchant) {
//       throw new CustomError("Merchant not found", 404);
//     }

//     if (!findMerchant.JazzCashDisburseAccountId) {
//       throw new CustomError("Disbursement account not assigned.", 404);
//     }

//     // find disbursement merchant
//     const findDisbureMerch: any = await jazzcashDisburse
//       .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
//       .then((res) => res?.data);

//     if (!findDisbureMerch) {
//       throw new CustomError("Disbursement account not found", 404);
//     }

//     // Phone number validation (must start with 92)
//     if (!body.phone.startsWith("92")) {
//       throw new CustomError("Number should start with 92", 400);
//     }

//     if (body.order_id) {
//       const checkOrder = await prisma.disbursement.findFirst({
//         where: {
//           merchant_custom_order_id: body.order_id,
//         },
//       });
//       if (checkOrder) {
//         throw new CustomError("Order ID already exists", 400);
//       }
//     }
//     let totalCommission: Decimal = new Decimal(0);
//     let totalGST: Decimal = new Decimal(0);
//     let totalWithholdingTax: Decimal = new Decimal(0);
//     let amountDecimal: Decimal = new Decimal(0);
//     let merchantAmount: Decimal = new Decimal(0);

//     await prisma.$transaction(async (tx) => {
//       let rate = await getMerchantRate(tx, findMerchant.merchant_id);

//       const transactions = await getEligibleTransactions(
//         findMerchant.merchant_id,
//         tx
//       );
//       if (transactions.length === 0) {
//         throw new CustomError("No eligible transactions to disburse", 400);
//       }
//       let updates: TransactionUpdate[] = [];
//       totalDisbursed = new Decimal(0);
//       if (body.amount) {
//         amountDecimal = new Decimal(body.amount);
//       } else {
//         updates = transactions.map((t: any) => ({
//           transaction_id: t.transaction_id,
//           disbursed: true,
//           balance: new Decimal(0),
//           settled_amount: t.settled_amount,
//           original_amount: t.original_amount,
//         }));
//         totalDisbursed = transactions.reduce(
//           (sum: Decimal, t: any) => sum.plus(t.balance),
//           new Decimal(0)
//         );
//         amountDecimal = totalDisbursed;
//       }
//       // Calculate total deductions and merchant amount
//       totalCommission = amountDecimal.mul(rate.disbursementRate);
//       totalGST = amountDecimal.mul(rate.disbursementGST);
//       totalWithholdingTax = amountDecimal.mul(
//         rate.disbursementWithHoldingTax
//       );
//       const totalDeductions = totalCommission
//         .plus(totalGST)
//         .plus(totalWithholdingTax);
//       merchantAmount = body.amount
//         ? amountDecimal.plus(totalDeductions)
//         : amountDecimal.minus(totalDeductions);

//       // Get eligible transactions

//       if (body.amount) {
//         const result = calculateDisbursement(transactions, merchantAmount);
//         updates = result.updates;
//         totalDisbursed = totalDisbursed.plus(result.totalDisbursed);
//       }
//       await updateTransactions(updates, tx);
//     }, {
//       // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
//       isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
//       maxWait: 60000,
//       timeout: 60000,
//     })
//     let id = transactionService.createTransactionId();
//     const payload = encryptData(
//       {
//         receiverCNIC: body.cnic,
//         receiverMSISDN: body.phone,
//         amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
//         referenceId: id
//       }, findDisbureMerch.key, findDisbureMerch.initialVector)

//     const requestData = {
//       data: payload
//     };
//     const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

//     // Example usage
//     (async () => {
//       await delay(1000); // Wait for 1 second
//     })();

//     const response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ma`, {
//       method: 'POST',
//       headers: {
//         'Accept': 'application/json',
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(requestData)
//     });
//     let res = await response.json();
//     console.log("MW Response", res);
//     if (!res.data) {
//       totalDisbursed = walletBalance + +totalDisbursed;
//       await backofficeService.adjustMerchantWalletBalance(findMerchant.merchant_id, totalDisbursed, false, walletBalance);
//       throw new CustomError("Throttled", 500);
//     }
//     res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
//     let data: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string } = {};
//     if (res.responseCode != "G2P-T-0") {
//       totalDisbursed = walletBalance + +totalDisbursed;

//       await backofficeService.adjustMerchantWalletBalance(findMerchant.merchant_id, totalDisbursed, false);
//       if (body.order_id) {
//         data["merchant_custom_order_id"] = body.order_id;
//       }
//       else {
//         data["merchant_custom_order_id"] = id;
//       }
//       // else {
//       data["system_order_id"] = id;
//       data["transaction_id"] = res.transactionID;
//       // }
//       // Get the current date
//       const date = new Date();

//       // Define the Pakistan timezone
//       const timeZone = 'Asia/Karachi';

//       // Convert the date to the Pakistan timezone
//       const zonedDate = toZonedTime(date, timeZone);
//       await prisma.disbursement.create({
//         data: {
//           ...data,
//           // transaction_id: id,
//           merchant_id: Number(findMerchant.merchant_id),
//           disbursementDate: zonedDate,
//           transactionAmount: amountDecimal,
//           commission: totalCommission,
//           gst: totalGST,
//           withholdingTax: totalWithholdingTax,
//           merchantAmount: body.amount ? body.amount : merchantAmount,
//           platform: 0,
//           account: body.phone,
//           provider: PROVIDERS.JAZZ_CASH,
//           status: "failed",
//           response_message: res.responseDescription
//         },
//       });
//       throw new CustomError(res.responseDescription, 500);
//     }
//     return await prisma.$transaction(
//       async (tx) => {
//         // Update transactions to adjust balances

//         if (body.order_id) {
//           data["merchant_custom_order_id"] = body.order_id;
//         }
//         else {
//           data["merchant_custom_order_id"] = id;
//         }
//         // else {
//         data["system_order_id"] = id;
//         data["transaction_id"] = res.transactionID;
//         // }
//         // Get the current date
//         const date = new Date();

//         // Define the Pakistan timezone
//         const timeZone = 'Asia/Karachi';

//         // Convert the date to the Pakistan timezone
//         const zonedDate = toZonedTime(date, timeZone);
//         // Create disbursement record
//         let disbursement = await tx.disbursement.create({
//           data: {
//             ...data,
//             // transaction_id: id,
//             merchant_id: Number(findMerchant.merchant_id),
//             disbursementDate: zonedDate,
//             transactionAmount: amountDecimal,
//             commission: totalCommission,
//             gst: totalGST,
//             withholdingTax: totalWithholdingTax,
//             merchantAmount: body.amount ? body.amount : merchantAmount,
//             platform: 0,
//             account: body.phone,
//             provider: PROVIDERS.JAZZ_CASH,
//             status: "completed",
//             response_message: "success"
//           },
//         });
//         let webhook_url: string;
//         if (findMerchant.callback_mode == "DOUBLE") {
//           webhook_url = findMerchant.payout_callback as string;
//         }
//         else {
//           webhook_url = findMerchant.webhook_url as string;
//         }
//         transactionService.sendCallback(
//           webhook_url,
//           {
//             original_amount: body.amount ? body.amount : merchantAmount,
//             date_time: zonedDate,
//             merchant_transaction_id: disbursement.merchant_custom_order_id,
//             merchant_id: findMerchant.merchant_id
//           },
//           body.phone,
//           "payout",
//           stringToBoolean(findMerchant.encrypted as string),
//           false
//         );

//         return {
//           message: "Disbursement created successfully",
//           merchantAmount: body.amount
//             ? body.amount.toString()
//             : merchantAmount.toString(),
//           order_id: disbursement.merchant_custom_order_id,
//           externalApiResponse: {
//             TransactionReference: res.transactionID,
//             TransactionStatus: "success",
//           },
//         };
//       },
//       {
//         maxWait: 5000,
//         timeout: 60000,
//       }
//     );
//   }
//   catch (err: any) {
//     console.log("MW Transaction Error", err);
//     throw new CustomError("Failed to initiate transaction", 500);
//   }
// }

async function mwTransaction(token: string, body: any, merchantId: string) {
  let findMerchant: any;
  let walletBalance;
  let totalDisbursed: number | Decimal = new Decimal(0);
  let balanceDeducted = false;
  let merchantAmount = new Decimal(0);
  let id = '';
  try {
    // validate Merchant
    console.log(JSON.stringify({ event: "MW_TRANSACTION_REQUEST", order_id: body.order_id, body: body }))
    findMerchant = await merchantService.findOne({
      uid: merchantId,
    });
    const balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
    walletBalance = balance.walletBalance; // Get the wallet balance
    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    // Phone number validation (must start with 92)
    if (!body.phone.startsWith("92")) {
      throw new CustomError("Number should start with 92", 400);
    }

    if (body.order_id) {
      const checkOrder = await prisma.disbursement.findFirst({
        where: {
          merchant_custom_order_id: body.order_id,
        },
      });
      if (checkOrder) {
        throw new CustomError("Order ID already exists", 400);
      }
    }
    let totalCommission: Decimal = new Decimal(0);
    let totalGST: Decimal = new Decimal(0);
    let totalWithholdingTax: Decimal = new Decimal(0);
    let amountDecimal: Decimal = new Decimal(body.amount);
    merchantAmount = new Decimal(body.amount);
    let data: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string } = {};
    id = transactionService.createTransactionId();
    if (body.order_id) {
      data["merchant_custom_order_id"] = body.order_id;
    }
    else {
      data["merchant_custom_order_id"] = id;
    }
    data["system_order_id"] = id;
    await prisma.$transaction(async (tx) => {
      try {
        let rate = await getMerchantRate(tx, findMerchant.merchant_id);

        // Calculate total deductions and merchant amount
        totalCommission = amountDecimal.mul(rate.disbursementRate);
        totalGST = amountDecimal.mul(rate.disbursementGST);
        totalWithholdingTax = amountDecimal.mul(
          rate.disbursementWithHoldingTax
        );
        const totalDeductions = totalCommission
          .plus(totalGST)
          .plus(totalWithholdingTax);
        merchantAmount = body.amount
          ? amountDecimal.plus(totalDeductions)
          : amountDecimal.minus(totalDeductions);

        // Get eligible transactions
        if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
          throw new CustomError("Insufficient balance to disburse", 400);
        }
        const result = await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, false);
        balanceDeducted = true;
        console.log(JSON.stringify({ event: "BALANCE_ADJUSTED", id, amount: +merchantAmount.toString(), order_id: body.order_id })) // Adjust the balance
      }
      catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === 'P2034') {
            await prisma.disbursement.create({
              data: {
                ...data,
                // transaction_id: id,
                merchant_id: Number(findMerchant.merchant_id),
                disbursementDate: new Date(),
                transactionAmount: amountDecimal,
                commission: totalCommission,
                gst: totalGST,
                withholdingTax: totalWithholdingTax,
                merchantAmount: body.amount ? body.amount : merchantAmount,
                platform: 0,
                account: body.phone,
                provider: PROVIDERS.JAZZ_CASH,
                status: "pending",
                response_message: "pending",
                to_provider: PROVIDERS.JAZZ_CASH,
                providerDetails: {
                  id: findMerchant?.JazzCashDisburseAccountId
                }
              },
            });
            throw new CustomError("Transaction is Pending", 202);
          }
        }
        throw new CustomError("Not Enough Balance", 400);
      }
    }, {
      // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    })
    const payload = encryptData(
      {
        receiverCNIC: body.cnic || "0000000000000",
        receiverMSISDN: body.phone,
        amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
        referenceId: id
      }, findDisbureMerch.key, findDisbureMerch.initialVector)
    const requestData = {
      data: payload
    };
    console.log(requestData)
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();
 
    const response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ma`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    if (!res.data) {
      console.log(JSON.stringify({ event: "MW_RESPONSE_DATA_NOT_RECIEVED", res, id, order_id: body.order_id }))
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
      await prisma.disbursement.create({
        data: {
          ...data,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: new Date(),
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.phone,
          provider: PROVIDERS.JAZZ_CASH,
          status: "pending",
          response_message: "pending",
          to_provider: PROVIDERS.JAZZ_CASH,
          providerDetails: {
            id: findMerchant?.JazzCashDisburseAccountId
          }
        },
      });
      balanceDeducted = false;
      throw new CustomError("Transaction is Pending", 202);
    }
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    // let res = {responseCode: "G2P-T-1",responseDescription: "Failed",transactionID: ""}

    if (res.responseCode != "G2P-T-0") {
      console.log(JSON.stringify({ event: "MW_PAYMENT_ERROR", res, id, order_id: body.order_id }))
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
      data["transaction_id"] = res?.transactionID || id;

      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.create({
        data: {
          ...data,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: zonedDate,
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.phone,
          provider: PROVIDERS.JAZZ_CASH,
          status: "failed",
          response_message: res.responseDescription,
          providerDetails: {
            id: findMerchant?.JazzCashDisburseAccountId
          }
        },
      });
      balanceDeducted = false;
      throw new CustomError(res.responseDescription, 500);
    }
    console.log(JSON.stringify({ event: "MW_TRANSACTION_SUCCESS", id: id, order_id: body.order_id, response: res }))
    return await prisma.$transaction(
      async (tx) => {
        // Update transactions to adjust balances
        data["transaction_id"] = res.transactionID;
        // }
        // Get the current date
        const date = new Date();

        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';

        // Convert the date to the Pakistan timezone
        const zonedDate = toZonedTime(date, timeZone);
        // Create disbursement record
        let disbursement = await tx.disbursement.create({
          data: {
            ...data,
            // transaction_id: id,
            merchant_id: Number(findMerchant.merchant_id),
            disbursementDate: zonedDate,
            transactionAmount: amountDecimal,
            commission: totalCommission,
            gst: totalGST,
            withholdingTax: totalWithholdingTax,
            merchantAmount: body.amount ? body.amount : merchantAmount,
            platform: 0,
            account: body.phone,
            provider: PROVIDERS.JAZZ_CASH,
            status: "completed",
            response_message: "success",
            providerDetails: {
              id: findMerchant?.JazzCashDisburseAccountId
            }
          },
        });
        let webhook_url: string;
        if (findMerchant.callback_mode == "DOUBLE") {
          webhook_url = findMerchant.payout_callback as string;
        }
        else {
          webhook_url = findMerchant.webhook_url as string;
        }
        transactionService.sendCallback(
          webhook_url,
          {
            original_amount: body.amount ? body.amount : merchantAmount,
            date_time: zonedDate,
            merchant_transaction_id: disbursement.merchant_custom_order_id,
            merchant_id: findMerchant.merchant_id
          },
          body.phone,
          "payout",
          stringToBoolean(findMerchant.encrypted as string),
          false
        );

        console.log(JSON.stringify({
          event: "MW_TRANSACTION_RESPONSE", order_id: body.order_id, response: {
            message: "Disbursement created successfully",
            merchantAmount: body.amount
              ? body.amount.toString()
              : merchantAmount.toString(),
            order_id: disbursement.merchant_custom_order_id,
            externalApiResponse: {
              TransactionReference: res.transactionID,
              TransactionStatus: "success",
            },
          }
        }))
        return {
          message: "Disbursement created successfully",
          merchantAmount: body.amount
            ? body.amount.toString()
            : merchantAmount.toString(),
          order_id: disbursement.merchant_custom_order_id,
          externalApiResponse: {
            TransactionReference: res.transactionID,
            TransactionStatus: "success",
          },
        };
      },
      {
        maxWait: 5000,
        timeout: 60000,
      }
    );
  }
  catch (err: any) {
    // console.log("MW Transaction Error", err);
    console.log(JSON.stringify({ event: "MW_TRANSACTION_ERROR", message: err?.message, statusCode: err?.statusCode == 202 ? 202 : 500, id: id, order_id: body.order_id }))

    if (balanceDeducted) {
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
    }
    throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
  }
}


async function mwTransactionClone(token: string, body: any, merchantId: string) {
  let findMerchant: any;
  let walletBalance;
  let totalDisbursed: number | Decimal = new Decimal(0);
  try {
    // validate Merchant
    findMerchant = await merchantService.findOne({
      uid: merchantId,
    });
    const balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
    walletBalance = balance.walletBalance; // Get the wallet balance
    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    // Phone number validation (must start with 92)
    if (!body.phone.startsWith("92")) {
      throw new CustomError("Number should start with 92", 400);
    }

    if (body.order_id) {
      const checkOrder = await prisma.disbursement.findFirst({
        where: {
          merchant_custom_order_id: body.order_id,
        },
      });
      if (checkOrder) {
        throw new CustomError("Order ID already exists", 400);
      }
    }
    let totalCommission: Decimal = new Decimal(0);
    let totalGST: Decimal = new Decimal(0);
    let totalWithholdingTax: Decimal = new Decimal(0);
    let amountDecimal: Decimal = new Decimal(body.amount);
    let merchantAmount: Decimal = new Decimal(body.amount);
    let data: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string } = {};
    let id = transactionService.createTransactionId();
    if (body.order_id) {
      data["merchant_custom_order_id"] = body.order_id;
    }
    else {
      data["merchant_custom_order_id"] = id;
    }
    data["system_order_id"] = id;
    await prisma.$transaction(async (tx) => {
      try {
        let rate = await getMerchantRate(tx, findMerchant.merchant_id);

        // Calculate total deductions and merchant amount
        totalCommission = amountDecimal.mul(rate.disbursementRate);
        totalGST = amountDecimal.mul(rate.disbursementGST);
        totalWithholdingTax = amountDecimal.mul(
          rate.disbursementWithHoldingTax
        );
        const totalDeductions = totalCommission
          .plus(totalGST)
          .plus(totalWithholdingTax);
        merchantAmount = body.amount
          ? amountDecimal.plus(totalDeductions)
          : amountDecimal.minus(totalDeductions);

        // Get eligible transactions
        if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
          throw new CustomError("Insufficient balance to disburse", 400);
        }
        const result = await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, false); // Adjust the balance
      }
      catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === 'P2034') {
            await prisma.disbursement.create({
              data: {
                ...data,
                // transaction_id: id,
                merchant_id: Number(findMerchant.merchant_id),
                disbursementDate: new Date(),
                transactionAmount: amountDecimal,
                commission: totalCommission,
                gst: totalGST,
                withholdingTax: totalWithholdingTax,
                merchantAmount: body.amount ? body.amount : merchantAmount,
                platform: 0,
                account: body.phone,
                provider: PROVIDERS.JAZZ_CASH,
                status: "pending",
                response_message: "pending",
                to_provider: PROVIDERS.JAZZ_CASH
              },
            });
            throw new CustomError("Transaction is Pending", 202);
          }
        }
        throw new CustomError("Not Enough Balance", 400);
      }
    }, {
      // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    })
    const payload = encryptData(
      {
        receiverCNIC: body.cnic,
        receiverMSISDN: body.phone,
        amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
        referenceId: id
      }, findDisbureMerch.key, findDisbureMerch.initialVector)

    const requestData = {
      data: payload
    };
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();

    const response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ma`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    console.log("MW Response", res);
    if (!res.data) {
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
      await prisma.disbursement.create({
        data: {
          ...data,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: new Date(),
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.phone,
          provider: PROVIDERS.JAZZ_CASH,
          status: "pending",
          response_message: "pending",
          to_provider: PROVIDERS.JAZZ_CASH
        },
      });
      throw new CustomError("Transaction is Pending", 202);
    }
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    // let res = {responseCode: "G2P-T-1",responseDescription: "Failed",transactionID: ""}

    if (res.responseCode != "G2P-T-0") {
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
      data["transaction_id"] = res?.transactionID || id;

      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.create({
        data: {
          ...data,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: zonedDate,
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: body.amount ? body.amount : merchantAmount,
          platform: 0,
          account: body.phone,
          provider: PROVIDERS.JAZZ_CASH,
          status: "failed",
          response_message: res.responseDescription
        },
      });
      throw new CustomError(res.responseDescription, 500);
    }
    return await prisma.$transaction(
      async (tx) => {
        // Update transactions to adjust balances
        data["transaction_id"] = res.transactionID;
        // }
        // Get the current date
        const date = new Date();

        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';

        // Convert the date to the Pakistan timezone
        const zonedDate = toZonedTime(date, timeZone);
        // Create disbursement record
        let disbursement = await tx.disbursement.create({
          data: {
            ...data,
            // transaction_id: id,
            merchant_id: Number(findMerchant.merchant_id),
            disbursementDate: zonedDate,
            transactionAmount: amountDecimal,
            commission: totalCommission,
            gst: totalGST,
            withholdingTax: totalWithholdingTax,
            merchantAmount: body.amount ? body.amount : merchantAmount,
            platform: 0,
            account: body.phone,
            provider: PROVIDERS.JAZZ_CASH,
            status: "completed",
            response_message: "success"
          },
        });
        let webhook_url: string;
        if (findMerchant.callback_mode == "DOUBLE") {
          webhook_url = findMerchant.payout_callback as string;
        }
        else {
          webhook_url = findMerchant.webhook_url as string;
        }
        transactionService.sendCallback(
          webhook_url,
          {
            original_amount: body.amount ? body.amount : merchantAmount,
            date_time: zonedDate,
            merchant_transaction_id: disbursement.merchant_custom_order_id,
            merchant_id: findMerchant.merchant_id
          },
          body.phone,
          "payout",
          stringToBoolean(findMerchant.encrypted as string),
          false
        );

        return {
          message: "Disbursement created successfully",
          merchantAmount: body.amount
            ? body.amount.toString()
            : merchantAmount.toString(),
          order_id: disbursement.merchant_custom_order_id,
          externalApiResponse: {
            TransactionReference: res.transactionID,
            TransactionStatus: "success",
          },
        };
      },
      {
        maxWait: 5000,
        timeout: 60000,
      }
    );
  }
  catch (err: any) {
    console.log("MW Transaction Error", err);
    throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
  }
}

async function simpleProductionMwTransactionClone(token: string, body: any, merchantId: string) {
  let findMerchant: any;
  let walletBalance;
  let totalDisbursed: number | Decimal = new Decimal(0);
  let obj: any = {};
  try {
    console.log("Token: ", token)
    // validate Merchant
    findMerchant = await merchantService.findOne({
      uid: merchantId,
    });
    const balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
    walletBalance = balance.walletBalance; // Get the wallet balance
    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    let id = transactionService.createTransactionId();

    obj["mw_request"] = {
      receiverCNIC: body.cnic,
      receiverMSISDN: body.phone,
      amount: body.amount,
      referenceId: id
    }
    const payload = encryptData(
      {
        receiverCNIC: body.cnic,
        receiverMSISDN: body.phone,
        amount: body.amount,
        referenceId: id
      }, findDisbureMerch.key, findDisbureMerch.initialVector)

    const requestData = {
      data: payload
    };
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();

    const response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ma`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    console.log("MW Response", res);
    if (!res.data) {
      obj["mw_response"] = res;
      return obj;
      // await prisma.disbursement.create({
      //   data: {
      //     ...data,
      //     // transaction_id: id,
      //     merchant_id: Number(findMerchant.merchant_id),
      //     disbursementDate: new Date(),
      //     transactionAmount: amountDecimal,
      //     commission: totalCommission,
      //     gst: totalGST,
      //     withholdingTax: totalWithholdingTax,
      //     merchantAmount: body.amount ? body.amount : merchantAmount,
      //     platform: 0,
      //     account: body.phone,
      //     provider: PROVIDERS.JAZZ_CASH,
      //     status: "pending",
      //     response_message: "pending",
      //     to_provider: PROVIDERS.JAZZ_CASH
      //   },
      // });
      // throw new CustomError("Transaction is Pending", 202);
    }
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    // let res = {responseCode: "G2P-T-1",responseDescription: "Failed",transactionID: ""}

    if (res.responseCode != "G2P-T-0") {

      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      obj["mw_response"] = res;
      return obj;
      // throw new CustomError(res.responseDescription, 500);
    }
    obj["mw_response"] = res;

    return obj;
  }
  catch (err: any) {
    console.log("MW Transaction Error", err);
    throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
  }
}

async function simpleSandboxMwTransactionClone(token: string, body: any, merchantId: string) {
  let findMerchant: any;
  let walletBalance;
  let totalDisbursed: number | Decimal = new Decimal(0);
  let obj: any = {};
  try {
    console.log("Token: ", token)
    // validate Merchant
    findMerchant = await merchantService.findOne({
      uid: merchantId,
    });
    const balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
    walletBalance = balance.walletBalance; // Get the wallet balance
    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    let id = transactionService.createTransactionId();

    obj["mw_request"] = {
      receiverCNIC: body.cnic,
      receiverMSISDN: body.phone,
      amount: body.amount,
      referenceId: id
    }
    const payload = encryptData(
      {
        receiverCNIC: body.cnic,
        receiverMSISDN: body.phone,
        amount: body.amount,
        referenceId: id
      }, findDisbureMerch.key, findDisbureMerch.initialVector)

    const requestData = {
      data: payload
    };
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();

    const response = await fetch(`https://jazz-sandbox.sahulatpay.com/sjzd-ma`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    console.log("MW Response", res);
    if (!res.data) {
      obj["mw_response"] = res;
      return obj;
      // await prisma.disbursement.create({
      //   data: {
      //     ...data,
      //     // transaction_id: id,
      //     merchant_id: Number(findMerchant.merchant_id),
      //     disbursementDate: new Date(),
      //     transactionAmount: amountDecimal,
      //     commission: totalCommission,
      //     gst: totalGST,
      //     withholdingTax: totalWithholdingTax,
      //     merchantAmount: body.amount ? body.amount : merchantAmount,
      //     platform: 0,
      //     account: body.phone,
      //     provider: PROVIDERS.JAZZ_CASH,
      //     status: "pending",
      //     response_message: "pending",
      //     to_provider: PROVIDERS.JAZZ_CASH
      //   },
      // });
      // throw new CustomError("Transaction is Pending", 202);
    }
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    // let res = {responseCode: "G2P-T-1",responseDescription: "Failed",transactionID: ""}

    if (res.responseCode != "G2P-T-0") {

      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      obj["mw_response"] = res;
      return obj;
      // throw new CustomError(res.responseDescription, 500);
    }
    obj["mw_response"] = res;

    return obj;
  }
  catch (err: any) {
    console.log("MW Transaction Error", err);
    throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
  }
}

async function updateMwTransaction(token: string, body: UpdateDisbursementPayload, merchantId: string) {
  let findMerchant: any;
  let walletBalance;
  let totalDisbursed: number | Decimal = new Decimal(0);
  let balanceDeducted = false;
  let merchantAmount = new Decimal(+body.merchantAmount + +body.commission + +body.gst + +body.withholdingTax);
  try {
    console.log(JSON.stringify({ event: "MW_PENDING_REQUEST", order_id: body.order_id, body: body }))
    // validate Merchant
    findMerchant = await merchantService.findOne({
      uid: merchantId,
    });
    const balance = await getWalletBalance(findMerchant?.merchant_id) as { walletBalance: number };
    walletBalance = balance.walletBalance; // Get the wallet balance
    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.JazzCashDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await jazzcashDisburse
      .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    // Phone number validation (must start with 92)
    if (!body.account.startsWith("92")) {
      throw new CustomError("Number should start with 92", 400);
    }

    if (body.order_id) {
      const checkOrder = await prisma.disbursement.findFirst({
        where: {
          merchant_custom_order_id: body.order_id,
        },
      });
      if (checkOrder) {
        console.log(JSON.stringify({ event: "MW_ORDER_ALREADY_EXISTS", order_id: body.order_id }))
        throw new CustomError("Order ID already exists", 400);
      }
    }

    let amountDecimal = new Decimal(0);
    let totalDisbursed: number | Decimal = new Decimal(body.merchantAmount);
    let data2: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string } = {};
    data2["merchant_custom_order_id"] = body.merchant_custom_order_id;
    data2["system_order_id"] = transactionService.createTransactionId();
    // Fetch merchant financial terms
    await prisma.$transaction(async (tx) => {
      try {
        let rate = await getMerchantRate(tx, findMerchant.merchant_id);

        if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
          await prisma.disbursement.update({
            where: {
              merchant_custom_order_id: data2.merchant_custom_order_id
            },
            data: {
              transaction_id: data2.system_order_id,
              status: "failed",
              response_message: "Not Enough Balance",
            },
          });
          console.log(JSON.stringify({ event: "MW_INSUFFICIENT_BALANCE", order_id: body.order_id }))
          throw new CustomError("Insufficient balance to disburse", 400);
        }
        console.log(JSON.stringify({ event: "MW_BALANCE_ADJUSTED", order_id: body.order_id }))
        const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, false);
        balanceDeducted = true;
      }
      catch (err: any) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === 'P2034') {
            throw new CustomError("Transaction is Pending", 202);
          }
        }
        throw new CustomError("Not Enough Balance", 400);
      }
    }, {
      // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    })
    const payload = encryptData(
      {
        receiverCNIC: body.cnic,
        receiverMSISDN: body.account,
        amount: body.merchantAmount ? formatAmount(+body.merchantAmount) : formatAmount(+merchantAmount),
        referenceId: data2.system_order_id
      }, findDisbureMerch.key, findDisbureMerch.initialVector)

    const requestData = {
      data: payload
    };
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Example usage
    (async () => {
      await delay(1000); // Wait for 1 second
    })();

    const response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-ma`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    console.log("MW Response", res);
    if (!res.data) {
      console.log(JSON.stringify({ event: "MW_PENDING_REQUEST_THROTTLED", order_id: body.order_id, response: res }))
      const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      balanceDeducted = false;
      throw new CustomError("Transaction is Pending", 202);
    }
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    // let res = {responseCode: "G2P-T-1",responseDescription: "Failed",transactionID: ""}
    if (res.responseCode != "G2P-T-0") {
      console.log(JSON.stringify({ event: "MW_PENDING_FAILED", order_id: body.order_id, response: res }))
      const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
      balanceDeducted = false;
      data2["transaction_id"] = res.transactionID || body.system_order_id;
      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.update({
        where: {
          merchant_custom_order_id: data2.merchant_custom_order_id
        },
        data: {
          transaction_id: data2.transaction_id,
          status: "failed",
          response_message: res.responseDescription,
          system_order_id: data2.system_order_id
        },
      });
      throw new CustomError(res.responseDescription, 500);
    }
    return await prisma.$transaction(
      async (tx) => {
        // Update transactions to adjust balances

        data2["transaction_id"] = res?.transactionID || body.system_order_id;
        // }
        // Get the current date
        const date = new Date();

        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';

        // Convert the date to the Pakistan timezone
        const zonedDate = toZonedTime(date, timeZone);
        // Create disbursement record
        let disbursement = await tx.disbursement.update({
          where: {
            merchant_custom_order_id: data2.merchant_custom_order_id
          },
          data: {
            transaction_id: data2.transaction_id,
            status: "completed",
            response_message: "success",
            system_order_id: data2.system_order_id
          },
        });
        let webhook_url: string;
        if (findMerchant.callback_mode == "DOUBLE") {
          webhook_url = findMerchant.payout_callback as string;
        }
        else {
          webhook_url = findMerchant.webhook_url as string;
        }
        transactionService.sendCallback(
          webhook_url,
          {
            original_amount: body.merchantAmount ? body.merchantAmount : merchantAmount,
            date_time: zonedDate,
            merchant_transaction_id: disbursement.merchant_custom_order_id,
            merchant_id: findMerchant.merchant_id
          },
          body.account,
          "payout",
          stringToBoolean(findMerchant.encrypted as string),
          false
        );
        console.log(JSON.stringify({
          event: "MW_PENDING_RESPONSE", order_id: body.order_id, response: {
            message: "Disbursement created successfully",
            merchantAmount: body.merchantAmount
              ? body.merchantAmount.toString()
              : merchantAmount.toString(),
            order_id: disbursement.merchant_custom_order_id,
            externalApiResponse: {
              TransactionReference: res.transactionID,
              TransactionStatus: "success",
            },
          }
        }))
        return {
          message: "Disbursement created successfully",
          merchantAmount: body.merchantAmount
            ? body.merchantAmount.toString()
            : merchantAmount.toString(),
          order_id: disbursement.merchant_custom_order_id,
          externalApiResponse: {
            TransactionReference: res.transactionID,
            TransactionStatus: "success",
          },
        };
      },
      {
        maxWait: 5000,
        timeout: 60000,
      }
    );
  }
  catch (err: any) {
    console.log("MW Transaction Error", err);
    if (balanceDeducted) {
      await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
    }
    throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
  }
}

async function checkTransactionStatus(token: string, body: any, merchantId: string) {
  // validate Merchant
  const findMerchant = await merchantService.findOne({
    uid: merchantId,
  });

  if (!findMerchant) {
    throw new CustomError("Merchant not found", 404);
  }

  if (!findMerchant.JazzCashDisburseAccountId) {
    throw new CustomError("Disbursement account not assigned.", 404);
  }

  // find disbursement merchant
  const findDisbureMerch: any = await jazzcashDisburse
    .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
    .then((res) => res?.data);

  if (!findDisbureMerch) {
    throw new CustomError("Disbursement account not found", 404);
  }

  const results = [];

  for (const id of body.transactionIds) {
    const transaction = await prisma.disbursement.findFirst({
      where: {
        merchant_custom_order_id: id,
        merchant_id: findMerchant.merchant_id
      }
    });
    if (!transaction || !transaction?.transaction_id) {
      results.push({ id, status: "Transaction not found" });
      continue;
    }
    console.log("Inquiry Payload: ", { originalReferenceId: transaction.transaction_id, referenceID: transactionService.createTransactionId() })
    const payload = encryptData(
      { originalReferenceId: transaction.system_order_id, referenceID: transactionService.createTransactionId() },
      findDisbureMerch.key, findDisbureMerch.initialVector
    );
    const requestData = {
      data: payload
    };
    console.log(requestData)
    try {

      const response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-inquiry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      const jsonResponse = decryptData((await response.json())?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
      results.push({ id, status: jsonResponse });
    } catch (error: any) {
      // Handle error (e.g., network issue) and add to results
      results.push({ id, status: null, error: error?.message });
    }
  }

  return results; // Array of status responses for each transaction ID
}

async function simpleCheckTransactionStatus(token: string, body: any, merchantId: string) {
  const findMerchant = await merchantService.findOne({
    uid: merchantId,
  })

  if (!findMerchant) {
    throw new CustomError("Merchant Not Found", 404);
  }
  const findDisbureMerch: any = await jazzcashDisburse
    .getDisburseAccount(findMerchant?.JazzCashDisburseAccountId)
    .then((res) => res?.data);

  if (!findDisbureMerch) {
    throw new CustomError("Disbursement account not found", 404);
  }
  const transaction = await prisma.disbursement.findUnique({
    where: {
      merchant_custom_order_id: body.originalReferenceId,
    }
  })

  if (!transaction || !transaction?.transaction_id) {
    throw new CustomError("Transaction Not Found", 404);
  }
  console.log("Inquiry Payload: ", body)
  const payload = encryptData(
    { ...body, originalReferenceId: transaction?.system_order_id },
    findDisbureMerch.key, findDisbureMerch.initialVector
  );
  const requestData = {
    data: payload
  };
  console.log("API Payload: ", requestData)
  let jsonResponse;
  try {
    const response = await fetch(`${process.env.JAZZCASH_PAYOUT_URL}/jzd-inquiry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    console.log("Response: ", response)
    jsonResponse = decryptData((await response.json())?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    // results.push({ id, status: jsonResponse });
  } catch (error: any) {
    // Handle error (e.g., network issue) and add to results
    // results.push({ id, status: null, error: error?.message });
    throw new CustomError(error?.message, 400)
  }
  return jsonResponse; // Array of status responses for each transaction ID
}

async function databaseCheckTransactionStatus(body: any, merchantId: string) {
  // validate Merchant
  const findMerchant = await merchantService.findOne({
    uid: merchantId,
  });

  if (!findMerchant) {
    throw new CustomError("Merchant not found", 404);
  }

  if (!findMerchant.JazzCashDisburseAccountId) {
    throw new CustomError("Disbursement account not assigned.", 404);
  }

  // find disbursement merchant
  const findDisbureMerch: any = await jazzcashDisburse
    .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
    .then((res) => res?.data);

  if (!findDisbureMerch) {
    throw new CustomError("Disbursement account not found", 404);
  }

  const results = [];

  for (const id of body.transactionIds) {
    const transaction = await prisma.disbursement.findFirst({
      where: {
        merchant_custom_order_id: id,
        merchant_id: findMerchant.merchant_id
      }
    });
    if (!transaction || !transaction?.transaction_id) {
      results.push({ id, status: "Transaction not found" });
      continue;
    }
    try {
      const jsonResponse = {
        responseCode: transaction?.status == "completed" ? "G2P-T-0" : transaction?.status == "failed" ? "G2P-T-1" : "G2P-T-2",
        responseDescription: transaction?.response_message,
        transactionID: transaction?.transaction_id,
        referenceID: transactionService.createTransactionId(),
        transactionStatus: transaction?.status?.charAt(0).toUpperCase() + transaction?.status?.slice(1),
        isReversed: transaction?.status == "completed" ? "0" : ""
      };
      results.push({ id, status: jsonResponse });
    } catch (error: any) {
      // Handle error (e.g., network issue) and add to results
      results.push({ id, status: null, error: error?.message });
    }
  }

  return results; // Array of status responses for each transaction ID
}

// {
//   "responseCode": "G2P-T-0",
//   "responseDescription": "Process service request successfully.",
//   "transactionID": "079896464953",
//   "referenceID": "ababjdbhdbhjabhda",
//   "transactionStatus": "Cancelled",
//   "isReversed": "0"
// }

async function simpleSandboxCheckTransactionStatus(token: string, body: any, merchantId: string) {
  // validate Merchant
  const findMerchant = await merchantService.findOne({
    uid: merchantId,
  });

  if (!findMerchant) {
    throw new CustomError("Merchant not found", 404);
  }

  if (!findMerchant.JazzCashDisburseAccountId) {
    throw new CustomError("Disbursement account not assigned.", 404);
  }

  // find disbursement merchant
  const findDisbureMerch: any = await jazzcashDisburse
    .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
    .then((res) => res?.data);

  if (!findDisbureMerch) {
    throw new CustomError("Disbursement account not found", 404);
  }

  const results = [];

  for (const id of body.transactionIds) {

    console.log("Inquiry Payload: ", { originalReferenceId: id, referenceID: transactionService.createTransactionId() })
    const payload = encryptData(
      { originalReferenceId: id, referenceID: transactionService.createTransactionId() },
      findDisbureMerch.key, findDisbureMerch.initialVector
    );
    const requestData = {
      data: payload
    };
    console.log(requestData)
    try {
      const response = await fetch(`https://jazz-sandbox.sahulatpay.com/sjzd-inquiry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      const jsonResponse = decryptData((await response.json())?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
      results.push({ id, status: jsonResponse });
    } catch (error: any) {
      // Handle error (e.g., network issue) and add to results
      results.push({ id, status: null, error: error?.message });
    }
  }

  return results; // Array of status responses for each transaction ID
}


// Main execution function to get the token and perform transactions
// (async function main() {
//   try {
//     process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
//     const token = await getToken();
//     console.log('Token:', token);

//     const initResult = await initiateTransaction(token);
//     console.log('Init Transaction:', initResult);

//     const confirmResult = await confirmTransaction(token);
//     console.log('Confirm Transaction:', confirmResult);

//     const mwResult = await mwTransaction(token);
//     console.log('MW Transaction:', mwResult);

//     const statusResult = await checkTransactionStatus(token);
//     console.log('Transaction Status:', statusResult);
//   } catch (error) {
//     console.error('Error:', error);
//   }
// })();

const getMerchantJazzCashDisburseInquiryMethod = async (merchant_id: string) => {
  return (await prisma.merchant.findFirst({
    where: {
      uid: merchant_id
    }
  }))?.jazzCashDisburseInquiryMethod
}

export {
  getToken,
  simpleGetToken,
  initiateTransaction,
  mwTransaction,
  checkTransactionStatus,
  simpleCheckTransactionStatus,
  updateMwTransaction,
  updateTransaction,
  initiateTransactionClone,
  mwTransactionClone,
  // mwTransactionClone,
  // initiateTransactionClone,
  updateTransactionClone,
  simpleSandboxGetToken,
  simpleSandboxMwTransactionClone,
  simpleSandboxinitiateTransactionClone,
  simpleSandboxCheckTransactionStatus,
  simpleProductionMwTransactionClone,
  simpleProductionInitiateTransactionClone,
  getMerchantJazzCashDisburseInquiryMethod,
  databaseCheckTransactionStatus
}
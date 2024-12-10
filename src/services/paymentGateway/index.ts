import { easyPaisaDisburse, merchantService, transactionService } from "../../services/index.js";
import CustomError from "../../utils/custom_error.js";
import { decryptData, encryptData } from "../../utils/enc_dec.js";
import { calculateDisbursement, getEligibleTransactions, getMerchantRate, updateTransactions } from "./disbursement.js";
import prisma from "../../prisma/client.js";
import { Decimal } from "@prisma/client/runtime/library";
import { PROVIDERS } from "../../constants/providers.js";
import jazzcashDisburse from "./jazzcashDisburse.js";
import { toZonedTime } from "date-fns-tz";


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

    if (!findMerchant.EasyPaisaDisburseAccountId) {
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

    const token = await fetch(`https://gateway.jazzcash.com.pk/token`, requestOptions)
      .then((response) => response.json())
      .then((result) => result)
      .catch((error) => error);
    console.log(token);
    return token;
  } catch (error) {
    console.error('Fetch error:', error);

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

    const token = await fetch(`https://gateway.jazzcash.com.pk/token`, requestOptions)
      .then((response) => response.json())
      .then((result) => result)
      .catch((error) => error);
    console.log(token);
    return token;
  } catch (error) {
    console.error('Fetch error:', error);

  }
}

async function initiateTransaction(token: string, body: any, merchantId: string) {
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

    // Fetch merchant financial terms
    let rate = await getMerchantRate(prisma, findMerchant.merchant_id);

    const transactions = await getEligibleTransactions(
      findMerchant.merchant_id,
      prisma
    );
    if (transactions.length === 0) {
      throw new CustomError("No eligible transactions to disburse", 400);
    }
    let updates: TransactionUpdate[] = [];
    let totalDisbursed = new Decimal(0);
    let amountDecimal;
    if (body.amount) {
      amountDecimal = new Decimal(body.amount);
    } else {
      updates = transactions.map((t: any) => ({
        transaction_id: t.transaction_id,
        disbursed: true,
        balance: new Decimal(0),
        settled_amount: t.settled_amount,
        original_amount: t.original_amount,
      }));
      totalDisbursed = transactions.reduce(
        (sum: Decimal, t: any) => sum.plus(t.balance),
        new Decimal(0)
      );
      amountDecimal = totalDisbursed;
    }
    // Calculate total deductions and merchant amount
    const totalCommission = amountDecimal.mul(rate.disbursementRate);
    const totalGST = amountDecimal.mul(rate.disbursementGST);
    const totalWithholdingTax = amountDecimal.mul(
      rate.disbursementWithHoldingTax
    );
    const totalDeductions = totalCommission
      .plus(totalGST)
      .plus(totalWithholdingTax);
    const merchantAmount = body.amount
      ? amountDecimal.plus(totalDeductions)
      : amountDecimal.minus(totalDeductions);

    // Get eligible transactions

    if (body.amount) {
      const result = calculateDisbursement(transactions, merchantAmount);
      updates = result.updates;
      totalDisbursed = result.totalDisbursed;
    }
    let id = transactionService.createTransactionId();
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
    let requestData = {
      data: payload,
    };

    let response = await fetch(`https://gateway.jazzcash.com.pk/jazzcash/third-party-integration/srv2/api/wso2/ibft/inquiry`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    let res = await response.json();
    let data = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    console.log("Initiate Response: ", data)

    if (data.responseCode != "G2P-T-0") {
      console.log("IBFT Response: ", data);
      throw new CustomError("Error with ibft inquiry", 500)
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
    }

    response = await fetch(`https://gateway.jazzcash.com.pk/jazzcash/third-party-integration/srv3/api/wso2/ibft/payment`, {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    res = await response.json();
    res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
    if (res.responseCode != "G2P-T-0") {
      console.log("IBFT Response: ", data);
      throw new CustomError("Error with ibft confirmation", 500)
    }
    return await prisma.$transaction(
      async (tx) => {
        // Update transactions to adjust balances
        await updateTransactions(updates, tx);

        let data: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string } = {};
        if (body.order_id) {
          data["merchant_custom_order_id"] = body.order_id;
        }
        else {
          data["merchant_custom_order_id"] = id;
        }
        // else {
        data["system_order_id"] = id;
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
            transaction_id: disbursement.transaction_id,
            merchant_id: findMerchant.merchant_id
          },
          body.phone,
          "payout",
          stringToBoolean(findMerchant.encrypted as string)
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
      },
      {
        maxWait: 5000,
        timeout: 60000,
      }
    );
  }
  catch (err) {
    console.log("Initiate Transaction Error", err);
    throw new CustomError("Failed to initiate transaction", 500);
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

async function mwTransaction(token: string, body: any, merchantId: string) {
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

  // Phone number validation (must start with 92)
  if (!body.phone.startsWith("92")) {
    throw new CustomError("Number should start with 92", 400);
  }

  // Fetch merchant financial terms
  let rate = await getMerchantRate(prisma, findMerchant.merchant_id);

  const transactions = await getEligibleTransactions(
    findMerchant.merchant_id,
    prisma
  );
  if (transactions.length === 0) {
    throw new CustomError("No eligible transactions to disburse", 400);
  }
  let updates: TransactionUpdate[] = [];
  let totalDisbursed = new Decimal(0);
  let amountDecimal;
  if (body.amount) {
    amountDecimal = new Decimal(body.amount);
  } else {
    updates = transactions.map((t: any) => ({
      transaction_id: t.transaction_id,
      disbursed: true,
      balance: new Decimal(0),
      settled_amount: t.settled_amount,
      original_amount: t.original_amount,
    }));
    totalDisbursed = transactions.reduce(
      (sum: Decimal, t: any) => sum.plus(t.balance),
      new Decimal(0)
    );
    amountDecimal = totalDisbursed;
  }
  // Calculate total deductions and merchant amount
  const totalCommission = amountDecimal.mul(rate.disbursementRate);
  const totalGST = amountDecimal.mul(rate.disbursementGST);
  const totalWithholdingTax = amountDecimal.mul(
    rate.disbursementWithHoldingTax
  );
  const totalDeductions = totalCommission
    .plus(totalGST)
    .plus(totalWithholdingTax);
  const merchantAmount = body.amount
    ? amountDecimal.plus(totalDeductions)
    : amountDecimal.minus(totalDeductions);

  // Get eligible transactions

  if (body.amount) {
    const result = calculateDisbursement(transactions, merchantAmount);
    updates = result.updates;
    totalDisbursed = result.totalDisbursed;
  }
  const payload = encryptData(
    {
      receiverCNIC: body.cnic,
      receiverMSISDN: body.phone,
      amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
      referenceId: transactionService.createTransactionId()
    }, findDisbureMerch.key, findDisbureMerch.initialVector)

  const requestData = {
    data: payload
  };

  const response = await fetch(`https://gateway.jazzcash.com.pk/jazzcash/third-party-integration/srv6/api/wso2/mw/payment`, {
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
  res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
  if (res.responseCode != "G2P-T-0") {
    throw new CustomError(res.responseDescription, 500);
  }
  return await prisma.$transaction(
    async (tx) => {
      // Update transactions to adjust balances
      await updateTransactions(updates, tx);

      let id = transactionService.createTransactionId();
      let data: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string } = {};
      if (body.order_id) {
        data["merchant_custom_order_id"] = body.order_id;
      }
      else {
        data["merchant_custom_order_id"] = id;
      }
      // else {
      data["system_order_id"] = id;
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
          transaction_id: disbursement.transaction_id,
          merchant_id: findMerchant.merchant_id
        },
        body.phone,
        "payout",
        stringToBoolean(findMerchant.encrypted as string)
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
    if(!transaction || !transaction?.transaction_id) {
      results.push({id, status: "Transaction not found"});
      continue;
    }
    console.log("Inquiry Payload: ",{ originalReferenceId: transaction.transaction_id, referenceID: transactionService.createTransactionId() })
    const payload = encryptData(
      { originalReferenceId: transaction.transaction_id, referenceID: transactionService.createTransactionId() },
      findDisbureMerch.key, findDisbureMerch.initialVector
    );
    const requestData = {
      data: payload
    };
    console.log(requestData)
    try {
      const response = await fetch(`https://gateway.jazzcash.com.pk/jazzcash/third-party-integration/srv1/api/wso2/transactionStatus`, {
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
  const results = [];

  for (const id of body.transactionIds) {
    console.log("Inquiry Payload: ",{ originalReferenceId: id, referenceID: transactionService.createTransactionId() })
    const payload = encryptData(
      { originalReferenceId: id, referenceID: transactionService.createTransactionId() },
      'z%C*F-J@NcRfUjXn', '6w9z$C&F)H@McQfT'
    );
    const requestData = {
      data: payload
    };
    console.log(requestData)
    try {
      const response = await fetch(`https://gateway.jazzcash.com.pk/jazzcash/third-party-integration/srv1/api/wso2/transactionStatus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      const jsonResponse = decryptData((await response.json())?.data, 'z%C*F-J@NcRfUjXn', '6w9z$C&F)H@McQfT');
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

export {
  getToken,
  simpleGetToken,
  initiateTransaction,
  mwTransaction,
  checkTransactionStatus,
  simpleCheckTransactionStatus
}
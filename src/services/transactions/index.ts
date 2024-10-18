import CustomError from "../../utils/custom_error.js";
import prisma from "../../prisma/client.js";
import analyticsService from "./analytics.js";
import { format } from "date-fns";

import type {
  TransactionRequest,
  CompleteRequest,
} from "types/transaction_request.js";
import { addWeekdays } from "utils/date_method.js";

const isValidTransactionRequest = (data: TransactionRequest) => {
  const errors = [];

  // Validate date_time
  if (!data.id || !data.id.startsWith("T")) {
    errors.push({ msg: "Invalid Transaction Id", param: "id" });
  }

  // Validate original_amount
  if (
    !data.original_amount ||
    isNaN(parseFloat(data.original_amount)) ||
    parseFloat(data.original_amount) <= 0
  ) {
    errors.push({
      msg: "Original amount must be a positive number",
      param: "original_amount",
    });
  }

  // Validate type
  const validTypes = ["wallet", "card", "bank"];
  if (!data.type || !validTypes.includes(data.type)) {
    errors.push({ msg: "Invalid transaction type", param: "type" });
  }

  return errors;
};

const isValidTransactionCompletion = (data: CompleteRequest) => {
  const errors = [];

  // Validate transaction_id
  if (!data.transaction_id || !data.transaction_id.startsWith("T")) {
    errors.push({
      msg: "Transaction ID must be a string",
      param: "transaction_id",
    });
  }

  // Validate status
  const validStatuses = ["completed", "failed"];
  if (!data.status || !validStatuses.includes(data.status)) {
    errors.push({ msg: "Invalid transaction status", param: "status" });
  }

  // Validate provider object if present
  if (data.provider) {
    if (!data.provider.name || typeof data.provider.name !== "string") {
      errors.push({
        msg: "Provider name must be a string",
        param: "provider.name",
      });
    }
    if (!data.provider.type || typeof data.provider.type !== "string") {
      errors.push({
        msg: "Provider transaction type must be a string",
        param: "provider.type",
      });
    }
    if (!data.provider.version || typeof data.provider.version !== "string") {
      errors.push({
        msg: "Provider version must be a string",
        param: "provider.version",
      });
    }
  }

  return errors;
};

const createTransaction = async (obj: any) => {
  console.log("Called");
  const { id, original_amount, type, merchant_id } = obj;
  const validationErrors = isValidTransactionRequest(obj);
  if (validationErrors.length > 0) {
    return { errors: validationErrors, success: false };
  }
  let commission = await prisma.merchantFinancialTerms.findUnique({
    where: { merchant_id },
  });
  let rate = commission?.commissionRate ?? 0;
  let gst = commission?.commissionGST ?? 0;
  let withTax = commission?.commissionWithHoldingTax ?? 0;
  try {
    console.log(new Date().toLocaleDateString());
    // Create a new transaction request in the database
    const transaction = await prisma.transaction.create({
      data: {
        transaction_id: id,
        date_time: new Date(),
        original_amount: parseFloat(original_amount),
        status: "pending", // Initially, the transaction is pending
        type: type,
        merchant: {
          connect: { id: merchant_id },
        },
        settled_amount:
          parseFloat(original_amount) *
          ((1 - (+rate + +gst + +withTax)) as unknown as number),
        balance:
          parseFloat(original_amount) *
          ((1 - (+rate + +gst + +withTax)) as unknown as number),
      },
    });
    console.log("Created");
    // Send the response with the created transaction

    return {
      message: "Transaction request created successfully",
      success: true,
      transaction,
    };
  } catch (error: any) {
    console.log(error);
    throw new CustomError(error?.error, error?.statusCode);
  }
};

const completeTransaction = async (obj: any) => {
  const {
    transaction_id,
    status,
    response_message,
    info,
    provider,
    merchant_id,
  } = obj;

  // Validate data
  const validationErrors = isValidTransactionCompletion(obj);
  if (validationErrors.length > 0) {
    return { errors: validationErrors, success: false };
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: {
        transaction_id: transaction_id,
        merchant_id,
        status: "pending",
      },
    });

    if (transaction) {
      // Update the transaction as completed or failed
      let date = new Date();
      const updatedTransaction = await prisma.transaction.update({
        where: {
          transaction_id: transaction_id,
          merchant_id,
        },
        data: {
          date_time: date,
          status: status,
          response_message: response_message || null,
          Provider: provider
            ? {
              connectOrCreate: {
                where: {
                  name_txn_type_version: {
                    name: provider.name,
                    txn_type: provider.type,
                    version: provider.version,
                  },
                },
                create: {
                  name: provider.name,
                  txn_type: provider.type,
                  version: provider.version,
                },
              },
            }
            : undefined,
          AdditionalInfo: info
            ? {
              create: {
                bank_id: info.bank_id || null,
                bill_reference: info.bill_reference || null,
                retrieval_ref: info.retrieval_ref || null,
                sub_merchant_id: info.sub_merchant_id || null,
                custom_field_1: info.custom_field_1 || null,
                custom_field_2: info.custom_field_2 || null,
                custom_field_3: info.custom_field_3 || null,
                custom_field_4: info.custom_field_4 || null,
                custom_field_5: info.custom_field_5 || null,
              },
            }
            : undefined,
        },
      });

      const settlment = await prisma.merchantFinancialTerms.findUnique({
        where: { merchant_id },
      });
      const scheduledAt = addWeekdays(
        date,
        settlment?.settlementDuration as number
      ); // Call the function to get the next 2 weekdays

      let scheduledTask;
      // Create the scheduled task in the database
      if (status == "completed") {
        scheduledTask = await prisma.scheduledTask.create({
          data: {
            transactionId: transaction_id,
            status: "pending",
            scheduledAt: scheduledAt, // Assign the calculated weekday date
            executedAt: null, // Assume executedAt is null when scheduling
          },
        });
      }

      // Send the response with the updated transaction
      return {
        message: `Transaction ${status} successfully`,
        transaction: updatedTransaction,
        task: scheduledTask,
      };
    } else {
      return { message: "Transaction not found" };
    }
  } catch (error) {
    console.error(error);
    return { message: "Internal server error" };
  }
};

const createTxn = async (obj: any) => {
  const currentTime = Date.now();
  const txnDateTime = format(new Date(), "yyyyMMddHHmmss");
  const fractionalMilliseconds = Math.floor(
    (currentTime - Math.floor(currentTime)) * 1000
  );

  const txnRefNo = `T${txnDateTime}${fractionalMilliseconds
    .toString()
    .padStart(5, "0")}`;
  let settledAmount = obj.amount * (1 - obj.commission);
  return await prisma.$transaction(async (tx) => {
    return await tx.transaction.create({
      data: {
        transaction_id: txnRefNo,
        date_time: new Date(),
        original_amount: obj.amount,
        type: obj.type,
        status: obj.status,
        merchant_id: obj.merchant_id,
        settled_amount: settledAmount,
        balance: settledAmount
      },
    });
  });
};

const updateTxn = async (transaction_id: string, obj: any) => {
  return await prisma.$transaction(async (tx) => {
    let transaction = await tx.transaction.update({
      where: {
        transaction_id: transaction_id,
      },
      data: {
        ...obj,
      },
    });
    if (obj.status == "completed") {
      const scheduledAt = addWeekdays(new Date(), obj.settlementDuration as number);  // Call the function to get the next 2 weekdays
      let scheduledTask = await prisma.scheduledTask.create({
        data: {
          transactionId: transaction_id,
          status: 'pending',
          scheduledAt: scheduledAt,  // Assign the calculated weekday date
          executedAt: null,  // Assume executedAt is null when scheduling
        }
      });
    }
  });

};

export default {
  createTransaction,
  completeTransaction,
  createTxn,
  updateTxn,
  ...analyticsService,
};

import CustomError from "../../utils/custom_error.js";
import crypto from "crypto";
import { format } from "date-fns";
import axios from "axios";
import prisma from "../../prisma/client.js";
import { JwtPayload } from "jsonwebtoken";

import type { TransactionRequest } from "types/transaction.d.ts";

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

const createTransaction = async (obj: any) => {
  const { id, original_amount, type } = obj;
  const validationErrors = isValidTransactionRequest(obj);
  if (validationErrors.length > 0) {
    return { errors: validationErrors, success: false };
  }
  
  let merchant_id = (obj.user as JwtPayload)?.id;
  try {
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
        settled_amount: parseFloat(original_amount),
      },
    });

    // Send the response with the created transaction

    return {
      message: "Transaction request created successfully",
      success: true,
      transaction,
    };
  } catch (error: any) {
    throw new CustomError(error?.error, error?.statusCode);
  }
};

export default {
  createTransaction,
};

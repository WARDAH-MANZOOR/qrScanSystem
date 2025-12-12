# Raast QR IPN Endpoint Documentation

## Overview
This document describes the Raast QR Instant Payment Notification (IPN) endpoint that allows Raast QR payment integrations to update transaction status in the system.

## Endpoint URL
```
POST /api/ipn/raast
```

## Request Body Structure
The IPN endpoint expects a JSON request body with the following fields (matching the exact format requested):

```json
{
  "order_id": "string",
  "Transection Id": "string",
  "status": "string",
  "response_message": "string"
}
```

### Field Descriptions
- `order_id` (required): The merchant's order identifier used to match the transaction
- `Transection Id` (required): The unique transaction identifier from Raast QR
- `status` (optional): Payment status (e.g., "completed", "failed", "pending")
- `response_message` (optional): Detailed response message from Raast QR

## Success Response
When the IPN is processed successfully, the endpoint returns:
```json
{
  "status": "success",
  "message": "Raast QR IPN processed successfully",
  "order_id": "order_id_value",
  "transaction_id": "Transection_Id_value"
}
```

## Error Responses
The endpoint returns appropriate HTTP status codes:
- 400: Bad Request - Missing required fields
- 500: Internal Server Error - Processing failure

## Usage Example
```bash
curl -X POST http://localhost:3000/api/ipn/raast \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "merchant_order_987654321",
    "Transection Id": "raast_tx_123456789",
    "status": "completed",
    "response_message": "Payment completed successfully"
  }'
```
import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";
import { encryptData } from "utils/enc_dec.js";

const baseUrl = 'https://gateway-sandbox.jazzcash.com.pk';
const tokenKey = 'RkR5Y250MXNTRWh5QXZvcnMyN2tLRDU1WE9jYTpBS2NCaTYyZ0Vmdl95YVZTQ0FCaHo2UnNKYWth';

async function getToken() {
  try {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Basic ${tokenKey}`);
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      // redirect: "follow"
    };

    const token = await fetch(`${baseUrl}/token`, requestOptions)
      .then((response) => response.json())
      .then((result) => result)
      .catch((error) => error);
    console.log(token);
    return token;
  } catch (error) {
    console.error('Fetch error:', error);

  }
}

async function initiateTransaction(token: string) {
  try {
    const id = transactionService.createTransactionId();
    const payload = encryptData({
      "bankAccountNumber": "01150100189365",
      "bankCode": "18",
      "amount": "10.00",
      "receiverMSISDN": "03142304891",
      "referenceId": id
    }, "mYjC!nc3dibleY3k", "Myin!tv3ctorjCM@")
    const requestData = {
      data: payload
    };

    const response = await fetch(`${baseUrl}/jazzcash/third-party-integration/srv2/api/wso2/ibft/inquiry`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    return await response.json();
  }
  catch (err) {
    console.log("Initiate Transaction Error",err);
    throw new CustomError("Failed to initiate transaction",500);
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

// async function mwTransaction(token) {
//   const requestData = {
//     data: '86928ea8e1b0efa3c42bb84ac4e3622911b54bbd5a3dcb35a1b7e2eb97e33ef52f39c64e94030ce81ad3b7664331d5d5b3af6ee86aacc40fcc74985a574b2fe1d2fe1c94d99bde6f87702c1a0c7cd4326998540b9bb2f4ebbd7bb58585956d307179ac5fd3aba7568d08d46c2b1ece482a4c79a72e5872580db44d12fbb6798d969ee20e20509935e2ea78e8a8649929'
//   };

//   const response = await fetch(`${baseUrl}/jazzcash/third-party-integration/srv6/api/wso2/mw/payment`, {
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

// async function checkTransactionStatus(token) {
//   const requestData = {
//     data: 'e49cc24c6dea0a3cc75a7a0f38721c408fd0b0bb6b85a81e1348e5da650a04e188ec47826f7996d98003b5fc58b3a2798d018292fb8939775c04102f3dada0df94211ac4807fdeda392d4a0cff19cff13738046ada3924fa6580ee6607a4985b'
//   };

//   const response = await fetch(`${baseUrl}/jazzcash/third-party-integration/srv1/api/wso2/transactionStatus`, {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${token}`,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify(requestData)
//   });
//   return await response.json();
// }

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
  initiateTransaction
}
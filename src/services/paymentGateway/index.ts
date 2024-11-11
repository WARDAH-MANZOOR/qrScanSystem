import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";
import { decryptData, encryptData } from "utils/enc_dec.js";

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

async function initiateTransaction(token: string, body: any) {
  try {
    const id = transactionService.createTransactionId();
    const payload = encryptData(body, "mYjC!nc3dibleY3k", "Myin!tv3ctorjCM@")
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
    return decryptData((await response.json())?.data, "mYjC!nc3dibleY3k", "Myin!tv3ctorjCM@");
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

async function mwTransaction(token: string, body: any) {
  const payload = encryptData(body, "mYjC!nc3dibleY3k", "Myin!tv3ctorjCM@")

  const requestData = {
    data: payload
  };

  const response = await fetch(`${baseUrl}/jazzcash/third-party-integration/srv6/api/wso2/mw/payment`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  return decryptData((await response.json())?.data, "mYjC!nc3dibleY3k", "Myin!tv3ctorjCM@");
}

async function checkTransactionStatus(token: string, body: any) {
  const results = [];

  for (const id of body.transactionIds) {
    const payload = encryptData(
      { originalReferenceId: id, referenceID: transactionService.createTransactionId() },
      "mYjC!nc3dibleY3k",
      "Myin!tv3ctorjCM@"
    );

    const requestData = {
      data: payload
    };
    console.log(requestData)
    try {
      const response = await fetch(`${baseUrl}/jazzcash/third-party-integration/srv1/api/wso2/transactionStatus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      const jsonResponse = decryptData((await response.json())?.data, "mYjC!nc3dibleY3k", "Myin!tv3ctorjCM@");
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
  initiateTransaction,
  mwTransaction,
  checkTransactionStatus
}
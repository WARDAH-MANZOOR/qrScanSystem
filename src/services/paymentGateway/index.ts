import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";
import { decryptData, encryptData } from "utils/enc_dec.js";

const productionUrl = 'https://gateway.jazzcash.com.pk';
const sandboxUrl = 'https://gateway-sandbox.jazzcash.com.pk'
const sandboxDetails = {
  tokenKey: "RkR5Y250MXNTRWh5QXZvcnMyN2tLRDU1WE9jYTpBS2NCaTYyZ0Vmdl95YVZTQ0FCaHo2UnNKYWth",
  key: "mYjC!nc3dibleY3k",
  initialVector: "Myin!tv3ctorjCM@"
}
const productionDetails = {
  tokenKey: "RWlNV1JPYkhJekNIWHRLM1lRdnZFXzhYVU5JYTpVMkdaazhHNWE0UW5DSFRXTnZGeXhFR2JFbXNh",
  key: "z%C*F-J@NcRfUjXn",
  initialVector: "6w9z$C&F)H@McQfT"
}

async function getToken(type: string) {
  try {
    const credentials = type == "s" ? sandboxDetails : productionDetails;
    const url = type == "s" ? sandboxUrl : productionUrl;
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Basic ${credentials.tokenKey}`);
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      // redirect: "follow"
    };

    const token = await fetch(`${url}/token`, requestOptions)
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
    const credentials = body.type == "s" ? sandboxDetails : productionDetails;
    const url = body.type == "s" ? sandboxUrl : productionUrl;
    let id = transactionService.createTransactionId();
    console.log("Initiate Request: ", { ...body, referenceId: id })
    let payload = encryptData({ ...body, referenceId: id }, credentials.key, credentials.initialVector)
    let requestData = {
      data: payload,
    };

    let response = await fetch(`${url}/jazzcash/third-party-integration/srv2/api/wso2/ibft/inquiry`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    let data = decryptData((await response.json())?.data, credentials.key, credentials.initialVector);
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
    }, credentials.key, credentials.initialVector)

    requestData = {
      data: payload
    }

    response = await fetch(`${url}/jazzcash/third-party-integration/srv3/api/wso2/ibft/payment`, {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    data = decryptData((await response.json())?.data, credentials.key, credentials.initialVector);

    return data;
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
  const credentials = body.type == "s" ? sandboxDetails : productionDetails;
  const url = body.type == "s" ? sandboxUrl : productionUrl;
  const payload = encryptData({...body, referenceId: transactionService.createTransactionId()}, credentials.key, credentials.initialVector)

  const requestData = {
    data: payload
  };

  const response = await fetch(`${url}/jazzcash/third-party-integration/srv6/api/wso2/mw/payment`, {
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
  return decryptData(res?.data, credentials.key, credentials.initialVector);
}

async function checkTransactionStatus(token: string, body: any) {
  const credentials = body.type == "s" ? sandboxDetails : productionDetails;
  const url = body.type == "s" ? sandboxUrl : productionUrl;
  const results = [];

  for (const id of body.transactionIds) {
    const payload = encryptData(
      { originalReferenceId: id, referenceID: transactionService.createTransactionId() },
      credentials.key, credentials.initialVector
    );

    const requestData = {
      data: payload
    };
    console.log(requestData)
    try {
      const response = await fetch(`${url}/jazzcash/third-party-integration/srv1/api/wso2/transactionStatus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      const jsonResponse = decryptData((await response.json())?.data, credentials.key, credentials.initialVector);
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
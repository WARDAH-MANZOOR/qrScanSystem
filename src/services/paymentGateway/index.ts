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
      .then((response) => response.text())
      .then((result) => result)
      .catch((error) => error);
    console.log(token);
    return token;
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

// async function initTransaction(token) {
//   const requestData = {
//     data: '8e7ad04bffae4f1b7985ee1d116d2a88fffaf4a673425924da6330ac6a403faca943c13d4b01c2fbe1d7e628b7f0c709efceeea5deadbf946f397b08cdcd3b665464a7b2bacb3eb2b5728f511977ec03530e6bc20bdf3439321eab9944073f1440fe85d936f7b6089c8a44a9806ca011422b958799fdf852333543bc1011f2b3b4f55132cecda4f5575d53351aa95b874074e940ffb22298d3f6efc6bb1808f054dbe38cf482d32fa3c272ed2a0e7a9f'
//   };

//   const response = await fetch(`${baseUrl}/jazzcash/third-party-integration/srv2/api/wso2/ibft/inquiry`, {
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

//     const initResult = await initTransaction(token);
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
  getToken
}
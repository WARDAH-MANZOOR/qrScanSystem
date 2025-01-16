import axios from 'axios';

async function sendPostRequests(url: string, transactionIds: any[]): Promise<void> {
  try {
    for (const obj of transactionIds) {
      const payload = { obj };

      // Send POST request
      const response = await axios.post(url, payload);
      
      console.log(`Transaction ID: ${obj.transactionId}, Status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error occurred during POST requests:', error);
  }
}

sendPostRequests('http://localhost:3001/payment/dummy-callback', [
  { "amount": "1000.00","msisdn": "03332165123","time": "2025-01-15, 23:11:00","order_id": "T202501152311370m1e1","status": "success","type": "payin"}
])
// const okPaytransactions = [
//   { "amount": "2000.00","msisdn": "03419045314","time": "2025-01-16, 02:07:00","order_id": "S016342501160507378957482922","status": "success","type": "payin"},
//   { "amount": "100.00","msisdn": "03080233635","time": "2025-01-16, 07:21:00","order_id": "S014102501161021040859623262","status": "success","type": "payin"},
//   { "amount": "100.00","msisdn": "03358673243","time": "2025-01-16, 04:19:00","order_id": "S015532501160719168558644365","status": "success","type": "payin"},
//   { "amount": "100.00","msisdn": "03460921284","time": "2025-01-16, 09:21:00","order_id": "S013652501161220203534805571","status": "success","type": "payin"},
//   { "amount": "500.00","msisdn": "03045399901","time": "2025-01-16, 09:35:00","order_id": "S013652501161235055484036455","status": "success","type": "payin"},
//   { "amount": "500.00","msisdn": "03012248712","time": "2025-01-16, 09:36:00","order_id": "S013972501161235493552080443","status": "success","type": "payin"},
//   { "amount": "500.00","msisdn": "03133025216","time": "2025-01-16, 09:35:00","order_id": "S012902501161235056424506857", "status": "success","type": "payin"},
//   { "amount": "500.00","msisdn": "03106911873","time": "2025-01-16, 09:15:00","order_id": "S013652501161215462172363542", "status": "success","type": "payin"},
// ]

// const okPayUrl = 'https://callback.wpay.one/CallBack/PKR_PayIn_SahulatPay_4ad9feceb00ca7df3f951f0d9407137a';
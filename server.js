const express = require('express');
const bodyParser = require('body-parser');
const BusinessSmsApi = require('./BusinessSmsApi');

const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your actual credentials
const smsApi = new BusinessSmsApi({ id: 'devtects', pass: 'devtects1122' });

function generateOTP() {
  return Math.floor(10000 + Math.random() * 90000).toString(); // Ensures 5 digits
}


app.use(bodyParser.json());

app.post('/send-sms', async (req, res) => {
  try {
    const { to, mask, lang, type } = req.body;
     const otp = generateOTP(); // Generate the OTP
    const msg = `OTP: ${otp}`;
    const result = await smsApi.sendSms({ to, mask, msg, lang, type });
    res.json({ success: true, response: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/balance', async (req, res) => {
  try {
    const result = await smsApi.getBalance();
    res.json({ success: true, response: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Business SMS API server running on port ${PORT}`);
});

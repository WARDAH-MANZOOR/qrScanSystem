// Interface for QR data
interface QRData {
  iban: string;
  bankCode: string | null;
}

// HTML Elements
const ibanInput = document.getElementById("iban") as HTMLInputElement;
const bankCodeInput = document.getElementById("bankCode") as HTMLInputElement;
const amountInput = document.getElementById("amount") as HTMLInputElement;
const phoneInput = document.getElementById("phone") as HTMLInputElement;

// Initialize QR scanner (global from CDN)
const html5QrCode = new (window as any).Html5Qrcode("reader");

html5QrCode.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: 300 }, // increased qrbox for better detection
  (decodedText: string) => {
    const qrData = extractQRData(decodedText);

    if (!qrData || !qrData.iban) {
      console.log("Unsupported QR code: " + decodedText);
      return;
    }

    // Auto-fill IBAN
    ibanInput.value = qrData.iban;

    // Auto-fill Bank Code
    bankCodeInput.value = qrData.bankCode
      ? qrData.bankCode
      : getBankCodeFromIBAN(qrData.iban);

    html5QrCode.stop();
  },
  (errorMessage: string) => {
    console.log("QR scan error:", errorMessage);
  }
);

// Function to handle multiple QR formats
function extractQRData(qrText: string): QRData | null {
  try {
    const data = JSON.parse(qrText);
    if (data.iban) return { iban: data.iban, bankCode: data.bankCode ?? null };
  } catch {}

  if (qrText.includes("iban=")) {
    const params = new URLSearchParams(qrText);
    return {
      iban: params.get("iban") || "",
      bankCode: params.get("bankCode") || null
    };
  }

  if (qrText.startsWith("PK")) {
    return { iban: qrText, bankCode: null };
  }

  return null;
}

// Derive bank code from IBAN if missing
function getBankCodeFromIBAN(iban: string): string {
  return iban.substring(4, 8);
}

// // Send payout request to backend
// function sendPayout(): void {
//   const iban = ibanInput.value;
//   const bankCode = bankCodeInput.value;
//   const amount = amountInput.value;
//   const phone = phoneInput.value;

//   if (!iban || !amount || !phone) {
//     alert("Please fill all required fields");
//     return;
//   }

//   fetch("http://localhost:3001/payment/jz-disburse/6707ced3-e584-4d8c-9166-297d56bc425f", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ iban, bankCode, amount, phone })
//   })
//     .then(res => res.json())
//     .then(() => alert("Payout Sent Successfully"))
//     .catch(err => alert("Error: " + (err as Error).message));
// }
function sendPayout(): void {
  const iban = ibanInput.value;
  const bankCode = bankCodeInput.value;
  const amount = amountInput.value;
  const phone = phoneInput.value;

  if (!iban || !amount || !phone) {
    alert("Please fill all required fields");
    return;
  }

  // Replace 'YOUR_API_KEY_HERE' with the actual API key required by your backend
  const apiKey = "YOUR_API_KEY_HERE";

  fetch(
    "http://localhost:3001/payment/jz-disburse/6707ced3-e584-4d8c-9166-297d56bc425f",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,   // <-- include API key here
      },
      body: JSON.stringify({ iban, bankCode, amount, phone }),
    }
  )
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(() => alert("Payout Sent Successfully"))
    .catch((err) => alert("Error: " + (err as Error).message));
}

// Make sendPayout globally accessible so HTML onclick works
(window as any).sendPayout = sendPayout;

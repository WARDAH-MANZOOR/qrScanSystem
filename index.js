function toBase64(str) {
    return btoa(decodeURIComponent(encodeURIComponent(str)));
}

// Example usage:
const originalString = "Test:PMnU M2if s7yY Q3dN quZy T9ZD";
const base64String = toBase64(originalString);
console.log(base64String);  // Outputs: SGVsbG8sIFJvY2t5IQ==
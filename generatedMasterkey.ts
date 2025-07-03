import crypto from 'crypto';

function generateMasterKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

console.log("Generated MASTER_KEY:", generateMasterKey());

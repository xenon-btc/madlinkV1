import { Buffer } from 'buffer';

// Key generation and derivation
async function generateKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encryption
export async function encrypt(data: any, password: string): Promise<{ encrypted: string, salt: string }> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await generateKey(password, salt);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(JSON.stringify(data));
  
  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    encodedData
  );

  // Combine IV and encrypted content
  const encryptedBuffer = new Uint8Array(iv.length + encryptedContent.byteLength);
  encryptedBuffer.set(iv);
  encryptedBuffer.set(new Uint8Array(encryptedContent), iv.length);

  return {
    encrypted: Buffer.from(encryptedBuffer).toString('base64'),
    salt: Buffer.from(salt).toString('base64')
  };
}

// Decryption
export async function decrypt(encryptedData: string, salt: string, password: string): Promise<any> {
  const encryptedBuffer = Buffer.from(encryptedData, 'base64');
  const saltBuffer = Buffer.from(salt, 'base64');
  
  const key = await generateKey(password, saltBuffer);
  
  // Extract IV and encrypted content
  const iv = encryptedBuffer.slice(0, 12);
  const content = encryptedBuffer.slice(12);

  const decryptedContent = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    content
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decryptedContent));
}
// Simple encryption/decryption for API keys
// Note: This is a basic implementation. In production, consider using more secure methods

export const encryptApiKey = (apiKey: string): string => {
  try {
    // Basic encoding to avoid storing plain text
    // In production, use proper encryption
    return btoa(apiKey);
  } catch (error) {
    console.error('Error encrypting API key:', error);
    return '';
  }
};

export const decryptApiKey = (encryptedKey: string): string => {
  try {
    // Basic decoding
    // In production, use proper decryption
    return atob(encryptedKey);
  } catch (error) {
    console.error('Error decrypting API key:', error);
    return '';
  }
}; 
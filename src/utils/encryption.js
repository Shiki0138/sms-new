const crypto = require('crypto');

// Configuration for encryption
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Generate a secure encryption key from environment variable or create a random one
 */
function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (envKey) {
    // Derive a proper key from the environment variable
    const hash = crypto.createHash('sha256');
    hash.update(envKey);
    return hash.digest();
  }
  
  // In production, this should never happen - always set ENCRYPTION_KEY
  console.warn('⚠️ No ENCRYPTION_KEY found in environment variables. Using default key.');
  return crypto.scryptSync('default-encryption-key-change-this', 'salt', KEY_LENGTH);
}

/**
 * Encrypt sensitive data
 * @param {Object|string} data - Data to encrypt
 * @returns {Object} Encrypted data with IV and auth tag
 */
function encrypt(data) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, key, iv);
    
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: ALGORITHM
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param {Object} encryptedData - Object containing encrypted, iv, and authTag
 * @returns {Object|string} Decrypted data
 */
function decrypt(encryptedData) {
  try {
    if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
      throw new Error('Invalid encrypted data format');
    }
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipher(
      encryptedData.algorithm || ALGORITHM,
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way)
 * @param {string} data - Data to hash
 * @returns {string} Hashed data
 */
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a random token
 * @param {number} length - Token length in bytes
 * @returns {string} Random token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Securely compare two strings (timing-safe)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings match
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Mask sensitive data for display purposes
 * @param {string} value - Value to mask
 * @param {number} visibleChars - Number of characters to show at the end
 * @returns {string} Masked value
 */
function maskSensitive(value, visibleChars = 4) {
  if (!value || typeof value !== 'string') {
    return '***';
  }
  
  if (value.length <= visibleChars) {
    return '***';
  }
  
  const visiblePart = value.slice(-visibleChars);
  const maskedLength = Math.min(value.length - visibleChars, 20);
  const asterisks = '*'.repeat(maskedLength);
  
  return asterisks + visiblePart;
}

/**
 * Validate encryption environment setup
 * @returns {Object} Validation result
 */
function validateEncryptionSetup() {
  const issues = [];
  
  if (!process.env.ENCRYPTION_KEY) {
    issues.push('ENCRYPTION_KEY environment variable is not set');
  } else if (process.env.ENCRYPTION_KEY.length < 32) {
    issues.push('ENCRYPTION_KEY should be at least 32 characters long');
  }
  
  // Test encryption/decryption
  try {
    const testData = { test: 'encryption_test' };
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    
    if (JSON.stringify(decrypted) !== JSON.stringify(testData)) {
      issues.push('Encryption/decryption test failed');
    }
  } catch (error) {
    issues.push(`Encryption test failed: ${error.message}`);
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

module.exports = {
  encrypt,
  decrypt,
  hash,
  generateToken,
  secureCompare,
  maskSensitive,
  validateEncryptionSetup
};
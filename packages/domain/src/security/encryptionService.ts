import crypto from 'crypto';

export interface EncryptedSecretEnvelope {
  keyVersion: number;
  iv: string; // Hex encoded initialization vector
  authTag: string; // Hex encoded authentication tag
  ciphertext: string; // Hex encoded ciphertext
}

export interface SecretDTO<T = Record<string, unknown>> {
  id: string;
  provider: string;
  maskedValue: string; // Always '[REDACTED]' in client DTOs
  keyVersion: number;
  updatedAt: Date;
}

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly DEFAULT_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  /**
   * Helper to encrypt a secret string into a compact format: `${iv}:${authTag}:${ciphertext}`
   */
  static encryptSecret(plaintext: string): string {
    const env = this.encrypt(plaintext, this.DEFAULT_KEY_HEX);
    return `${env.iv}:${env.authTag}:${env.ciphertext}`;
  }

  /**
   * Helper to decrypt a compact secret string.
   */
  static decryptSecret(compact: string): string {
    const [iv, authTag, ciphertext] = compact.split(':');
    return this.decrypt({ keyVersion: 1, iv, authTag, ciphertext }, this.DEFAULT_KEY_HEX);
  }

  /**
   * Encrypts plaintext string using AES-256-GCM.
   */
  static encrypt(
    plaintext: string,
    keyHex: string,
    keyVersion: number = 1
  ): EncryptedSecretEnvelope {
    const key = Buffer.from(keyHex.padEnd(64, '0').slice(0, 64), 'hex');
    const iv = crypto.randomBytes(this.IV_LENGTH);

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return {
      keyVersion,
      iv: iv.toString('hex'),
      authTag,
      ciphertext
    };
  }

  /**
   * Decrypts ciphertext envelope using AES-256-GCM.
   */
  static decrypt(envelope: EncryptedSecretEnvelope, keyHex: string): string {
    const key = Buffer.from(keyHex.padEnd(64, '0').slice(0, 64), 'hex');
    const iv = Buffer.from(envelope.iv, 'hex');
    const authTag = Buffer.from(envelope.authTag, 'hex');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(envelope.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Key rotation hook:
   * Re-encrypts an existing secret with a new encryption key and new key version.
   */
  static rotateKey(
    envelope: EncryptedSecretEnvelope,
    oldKeyHex: string,
    newKeyHex: string,
    newKeyVersion: number
  ): EncryptedSecretEnvelope {
    const plaintext = this.decrypt(envelope, oldKeyHex);
    return this.encrypt(plaintext, newKeyHex, newKeyVersion);
  }

  /**
   * Converts a secret into a safe client-facing DTO, guaranteeing secret values are masked.
   */
  static toSafeDTO(
    id: string,
    provider: string,
    envelope: EncryptedSecretEnvelope,
    updatedAt: Date = new Date()
  ): SecretDTO {
    return {
      id,
      provider,
      maskedValue: '[REDACTED]',
      keyVersion: envelope.keyVersion,
      updatedAt
    };
  }
}

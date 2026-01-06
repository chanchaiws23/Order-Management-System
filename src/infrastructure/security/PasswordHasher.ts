import * as crypto from 'crypto';

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
  isStrongPassword(password: string): { valid: boolean; errors: string[] };
}

export class PasswordHasher implements IPasswordHasher {
  private readonly iterations = 100000;
  private readonly keyLength = 64;
  private readonly digest = 'sha512';

  async hash(password: string): Promise<string> {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = await this.pbkdf2(password, salt);
    return `${salt}:${hash}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    
    const computedHash = await this.pbkdf2(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  isStrongPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }
    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    const commonPasswords = ['password123', 'qwerty123456', 'admin123456'];
    if (commonPasswords.some(cp => password.toLowerCase().includes(cp))) {
      errors.push('Password is too common');
    }

    return { valid: errors.length === 0, errors };
  }

  private pbkdf2(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, this.iterations, this.keyLength, this.digest, (err, key) => {
        if (err) reject(err);
        else resolve(key.toString('hex'));
      });
    });
  }
}

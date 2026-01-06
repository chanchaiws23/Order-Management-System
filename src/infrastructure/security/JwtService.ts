import * as crypto from 'crypto';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface IJwtService {
  generateTokenPair(userId: string, email: string, role: string): TokenPair;
  verifyAccessToken(token: string): TokenPayload | null;
  verifyRefreshToken(token: string): TokenPayload | null;
  hashToken(token: string): string;
  decodeWithoutVerify(token: string): TokenPayload | null;
}

export class JwtService implements IJwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: number;
  private readonly refreshExpiresIn: number;

  constructor(config?: {
    accessSecret?: string;
    refreshSecret?: string;
    accessExpiresInMinutes?: number;
    refreshExpiresInDays?: number;
  }) {
    this.accessSecret = config?.accessSecret || process.env.JWT_ACCESS_SECRET || crypto.randomBytes(32).toString('hex');
    this.refreshSecret = config?.refreshSecret || process.env.JWT_REFRESH_SECRET || crypto.randomBytes(32).toString('hex');
    this.accessExpiresIn = (config?.accessExpiresInMinutes || 15) * 60;
    this.refreshExpiresIn = (config?.refreshExpiresInDays || 7) * 24 * 60 * 60;
  }

  generateTokenPair(userId: string, email: string, role: string): TokenPair {
    const now = Math.floor(Date.now() / 1000);
    
    const accessPayload: TokenPayload = {
      userId,
      email,
      role,
      type: 'access',
      iat: now,
      exp: now + this.accessExpiresIn,
      jti: crypto.randomUUID(),
    };

    const refreshPayload: TokenPayload = {
      userId,
      email,
      role,
      type: 'refresh',
      iat: now,
      exp: now + this.refreshExpiresIn,
      jti: crypto.randomUUID(),
    };

    return {
      accessToken: this.sign(accessPayload, this.accessSecret),
      refreshToken: this.sign(refreshPayload, this.refreshSecret),
      expiresIn: this.accessExpiresIn,
    };
  }

  verifyAccessToken(token: string): TokenPayload | null {
    const payload = this.verify(token, this.accessSecret);
    if (payload && payload.type === 'access') {
      return payload;
    }
    return null;
  }

  verifyRefreshToken(token: string): TokenPayload | null {
    const payload = this.verify(token, this.refreshSecret);
    if (payload && payload.type === 'refresh') {
      return payload;
    }
    return null;
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  decodeWithoutVerify(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return payload as TokenPayload;
    } catch {
      return null;
    }
  }

  private sign(payload: TokenPayload, secret: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    return `${headerB64}.${payloadB64}.${signature}`;
  }

  private verify(token: string, secret: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [headerB64, payloadB64, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as TokenPayload;
      
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}

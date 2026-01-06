export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: unknown;
}

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'date' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: unknown[];
  sanitize?: boolean;
  items?: ValidationRule;
  properties?: Record<string, ValidationRule>;
}

export interface IInputValidator {
  validate(value: unknown, rules: ValidationRule): ValidationResult;
  sanitizeString(input: string): string;
  sanitizeHtml(input: string): string;
  isValidUUID(input: string): boolean;
  isValidEmail(input: string): boolean;
  escapeSQL(input: string): string;
}

export class InputValidator implements IInputValidator {
  validate(value: unknown, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];

    if (value === undefined || value === null || value === '') {
      if (rules.required) {
        errors.push('Field is required');
      }
      return { valid: errors.length === 0, errors };
    }

    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push('Must be a string');
        } else {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`Must be at least ${rules.minLength} characters`);
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`Must not exceed ${rules.maxLength} characters`);
          }
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push('Invalid format');
          }
          if (rules.enum && !rules.enum.includes(value)) {
            errors.push(`Must be one of: ${rules.enum.join(', ')}`);
          }
        }
        break;

      case 'number':
        const num = typeof value === 'number' ? value : parseFloat(value as string);
        if (isNaN(num)) {
          errors.push('Must be a valid number');
        } else {
          if (rules.min !== undefined && num < rules.min) {
            errors.push(`Must be at least ${rules.min}`);
          }
          if (rules.max !== undefined && num > rules.max) {
            errors.push(`Must not exceed ${rules.max}`);
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push('Must be a boolean');
        }
        break;

      case 'email':
        if (!this.isValidEmail(value as string)) {
          errors.push('Must be a valid email address');
        }
        break;

      case 'uuid':
        if (!this.isValidUUID(value as string)) {
          errors.push('Must be a valid UUID');
        }
        break;

      case 'date':
        const date = new Date(value as string);
        if (isNaN(date.getTime())) {
          errors.push('Must be a valid date');
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push('Must be an array');
        } else if (rules.items) {
          value.forEach((item, index) => {
            const itemResult = this.validate(item, rules.items!);
            if (!itemResult.valid) {
              errors.push(`Item ${index}: ${itemResult.errors.join(', ')}`);
            }
          });
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push('Must be an object');
        } else if (rules.properties) {
          for (const [key, propRules] of Object.entries(rules.properties)) {
            const propValue = (value as Record<string, unknown>)[key];
            const propResult = this.validate(propValue, propRules);
            if (!propResult.valid) {
              errors.push(`${key}: ${propResult.errors.join(', ')}`);
            }
          }
        }
        break;
    }

    let sanitized = value;
    if (rules.sanitize && typeof value === 'string') {
      sanitized = this.sanitizeString(value);
    }

    return { valid: errors.length === 0, errors, sanitized };
  }

  sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .slice(0, 10000);
  }

  sanitizeHtml(input: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;',
    };
    return input.replace(/[&<>"'/]/g, char => htmlEntities[char] || char);
  }

  isValidUUID(input: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(input);
  }

  isValidEmail(input: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(input) && input.length <= 254;
  }

  escapeSQL(input: string): string {
    return input.replace(/['";\\]/g, char => '\\' + char);
  }
}

export const commonValidationRules = {
  id: { type: 'uuid' as const, required: true },
  email: { type: 'email' as const, required: true, maxLength: 254 },
  password: { type: 'string' as const, required: true, minLength: 12, maxLength: 128 },
  name: { type: 'string' as const, required: true, minLength: 1, maxLength: 100, sanitize: true },
  description: { type: 'string' as const, maxLength: 5000, sanitize: true },
  price: { type: 'number' as const, required: true, min: 0, max: 999999999 },
  quantity: { type: 'number' as const, required: true, min: 0, max: 999999 },
  page: { type: 'number' as const, min: 1, max: 10000 },
  limit: { type: 'number' as const, min: 1, max: 100 },
};

import { InputValidator } from '../../../src/infrastructure/security/InputValidator';

describe('InputValidator', () => {
  let validator: InputValidator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  describe('validate - string', () => {
    it('should validate required string', () => {
      const result = validator.validate('hello', { type: 'string', required: true });
      expect(result.valid).toBe(true);
    });

    it('should fail for empty required string', () => {
      const result = validator.validate('', { type: 'string', required: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field is required');
    });

    it('should validate min length', () => {
      const result = validator.validate('hi', { type: 'string', minLength: 5 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be at least 5 characters');
    });

    it('should validate max length', () => {
      const result = validator.validate('hello world', { type: 'string', maxLength: 5 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must not exceed 5 characters');
    });

    it('should validate pattern', () => {
      const result = validator.validate('abc123', { type: 'string', pattern: /^[a-z]+$/ });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid format');
    });

    it('should validate enum', () => {
      const result = validator.validate('invalid', { type: 'string', enum: ['a', 'b', 'c'] });
      expect(result.valid).toBe(false);
    });
  });

  describe('validate - number', () => {
    it('should validate number', () => {
      const result = validator.validate(42, { type: 'number', required: true });
      expect(result.valid).toBe(true);
    });

    it('should validate number from string', () => {
      const result = validator.validate('42', { type: 'number' });
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid number', () => {
      const result = validator.validate('not-a-number', { type: 'number' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be a valid number');
    });

    it('should validate min', () => {
      const result = validator.validate(5, { type: 'number', min: 10 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be at least 10');
    });

    it('should validate max', () => {
      const result = validator.validate(100, { type: 'number', max: 50 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must not exceed 50');
    });
  });

  describe('validate - email', () => {
    it('should validate valid email', () => {
      const result = validator.validate('test@example.com', { type: 'email' });
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid email', () => {
      const result = validator.validate('invalid-email', { type: 'email' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be a valid email address');
    });
  });

  describe('validate - uuid', () => {
    it('should validate valid UUID', () => {
      const result = validator.validate('123e4567-e89b-12d3-a456-426614174000', { type: 'uuid' });
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid UUID', () => {
      const result = validator.validate('not-a-uuid', { type: 'uuid' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be a valid UUID');
    });
  });

  describe('validate - date', () => {
    it('should validate valid date', () => {
      const result = validator.validate('2024-01-15', { type: 'date' });
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid date', () => {
      const result = validator.validate('not-a-date', { type: 'date' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be a valid date');
    });
  });

  describe('validate - array', () => {
    it('should validate array', () => {
      const result = validator.validate([1, 2, 3], { type: 'array' });
      expect(result.valid).toBe(true);
    });

    it('should fail for non-array', () => {
      const result = validator.validate('not-array', { type: 'array' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be an array');
    });

    it('should validate array items', () => {
      const result = validator.validate(['a', 123, 'c'], {
        type: 'array',
        items: { type: 'string' },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(validator.sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove angle brackets', () => {
      expect(validator.sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });

    it('should remove javascript: protocol', () => {
      expect(validator.sanitizeString('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should remove event handlers', () => {
      expect(validator.sanitizeString('onclick=alert(1)')).toBe('alert(1)');
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML entities', () => {
      expect(validator.sanitizeHtml('<script>')).toBe('&lt;script&gt;');
      expect(validator.sanitizeHtml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(validator.sanitizeHtml("it's")).toBe('it&#x27;s');
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUID', () => {
      expect(validator.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      expect(validator.isValidUUID('invalid')).toBe(false);
      expect(validator.isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(validator.isValidEmail('test@example.com')).toBe(true);
      expect(validator.isValidEmail('user.name@domain.co.th')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(validator.isValidEmail('invalid')).toBe(false);
      expect(validator.isValidEmail('@example.com')).toBe(false);
      expect(validator.isValidEmail('test@')).toBe(false);
    });
  });

  describe('escapeSQL', () => {
    it('should escape SQL special characters', () => {
      expect(validator.escapeSQL("O'Brien")).toBe("O\\'Brien");
      expect(validator.escapeSQL('test"value')).toBe('test\\"value');
      expect(validator.escapeSQL('a;b')).toBe('a\\;b');
    });
  });

  describe('validate - boolean', () => {
    it('should validate boolean true', () => {
      const result = validator.validate(true, { type: 'boolean' });
      expect(result.valid).toBe(true);
    });

    it('should validate boolean false', () => {
      const result = validator.validate(false, { type: 'boolean' });
      expect(result.valid).toBe(true);
    });

    it('should validate string "true"', () => {
      const result = validator.validate('true', { type: 'boolean' });
      expect(result.valid).toBe(true);
    });

    it('should validate string "false"', () => {
      const result = validator.validate('false', { type: 'boolean' });
      expect(result.valid).toBe(true);
    });

    it('should fail for non-boolean value', () => {
      const result = validator.validate('yes', { type: 'boolean' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be a boolean');
    });
  });

  describe('validate - object', () => {
    it('should validate object', () => {
      const result = validator.validate({ name: 'test' }, { type: 'object' });
      expect(result.valid).toBe(true);
    });

    it('should fail for non-object (string)', () => {
      const result = validator.validate('not-object', { type: 'object' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be an object');
    });

    it('should fail for null when required', () => {
      const result = validator.validate(null, { type: 'object', required: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field is required');
    });

    it('should fail for array', () => {
      const result = validator.validate([1, 2, 3], { type: 'object' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be an object');
    });

    it('should validate object with properties schema', () => {
      const result = validator.validate(
        { name: 'test', age: 25 },
        {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            age: { type: 'number', min: 0 },
          },
        }
      );
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid nested properties', () => {
      const result = validator.validate(
        { name: '', age: -5 },
        {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            age: { type: 'number', min: 0 },
          },
        }
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('validate - sanitize option', () => {
    it('should sanitize string when sanitize option is true', () => {
      const result = validator.validate('  <script>test</script>  ', {
        type: 'string',
        sanitize: true,
      });
      expect(result.sanitized).toBe('scripttest/script');
    });
  });
});

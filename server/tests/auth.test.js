import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { registerSchema, loginSchema } from '../src/validators/auth.validator.js';
import { ApiError } from '../src/utils/ApiError.js';
import { ApiResponse } from '../src/utils/apiResponse.js';

test('Auth Validator: registerSchema validates correct inputs', () => {
  const validData = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123'
  };

  const result = registerSchema.safeParse(validData);
  assert.equal(result.success, true);
  assert.equal(result.data.email, 'john@example.com');
});

test('Auth Validator: registerSchema rejects invalid email and short password', () => {
  const invalidData = {
    name: 'J',
    email: 'not-an-email',
    password: '123'
  };

  const result = registerSchema.safeParse(invalidData);
  assert.equal(result.success, false);
  const fieldErrors = result.error.errors.map((e) => e.path[0]);
  assert.ok(fieldErrors.includes('name'));
  assert.ok(fieldErrors.includes('email'));
  assert.ok(fieldErrors.includes('password'));
});

test('Auth Validator: loginSchema requires valid email and non-empty password', () => {
  const validLogin = { email: 'test@example.com', password: 'secretpassword' };
  assert.equal(loginSchema.safeParse(validLogin).success, true);

  const invalidLogin = { email: 'bademail', password: '' };
  assert.equal(loginSchema.safeParse(invalidLogin).success, false);
});

test('Security: Bcrypt hashes and verifies passwords correctly', async () => {
  const rawPassword = 'SecurePassword2025!';
  const hash = await bcrypt.hash(rawPassword, 10);

  const isMatch = await bcrypt.compare(rawPassword, hash);
  const isWrong = await bcrypt.compare('WrongPassword', hash);

  assert.equal(isMatch, true);
  assert.equal(isWrong, false);
});

test('Security: JWT tokens can be signed and verified with secret', () => {
  const secret = 'test-secret-key-12345';
  const payload = { id: 'user_123', email: 'test@closr.dev' };
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });

  const decoded = jwt.verify(token, secret);
  assert.equal(decoded.id, 'user_123');
  assert.equal(decoded.email, 'test@closr.dev');
});

test('API Response Formatter: formats success and error payloads consistently', () => {
  const apiResp = new ApiResponse(200, { test: true }, 'Operation succeeded');
  assert.equal(apiResp.statusCode, 200);
  assert.equal(apiResp.success, true);
  assert.equal(apiResp.message, 'Operation succeeded');

  const apiErr = new ApiError(400, 'Bad input', [{ field: 'email', message: 'Invalid' }]);
  assert.equal(apiErr.statusCode, 400);
  assert.equal(apiErr.success, false);
  assert.equal(apiErr.errors.length, 1);
});

test('Auth Security: Token blacklist simulation revokes logged out sessions', () => {
  const blacklistedTokens = new Set();
  const token = 'sample_jwt_revoked_token_abcdef123456';
  
  // User logs out -> token added to blacklist
  blacklistedTokens.add(token);

  // Authenticate attempt
  const isRevoked = blacklistedTokens.has(token);
  assert.equal(isRevoked, true);

  // Non-blacklisted token passes check
  const activeToken = 'sample_jwt_valid_active_token_987654';
  assert.equal(blacklistedTokens.has(activeToken), false);
});


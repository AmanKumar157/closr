import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
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

test('Auth Security: Token blacklist simulation revokes logged out sessions using SHA-256 hash', () => {
  const blacklistedHashes = new Set();
  const token = 'sample_jwt_revoked_token_abcdef123456';
  
  // User logs out -> SHA-256 hash of token stored in DB (prevents raw JWT exposure)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  blacklistedHashes.add(tokenHash);

  // Authenticate attempt: check if candidate token's hash is blacklisted
  const candidateHash = crypto.createHash('sha256').update(token).digest('hex');
  const isRevoked = blacklistedHashes.has(candidateHash);
  assert.equal(isRevoked, true);

  // Non-blacklisted active token passes check
  const activeToken = 'sample_jwt_valid_active_token_987654';
  const activeHash = crypto.createHash('sha256').update(activeToken).digest('hex');
  assert.equal(blacklistedHashes.has(activeHash), false);
});

test('Auth Security: Prohibits passing tokens in URL query parameters', () => {
  // Simulates policy that tokens must strictly be in HTTP-only cookies or Authorization header
  const extractToken = (req) => {
    let token = req.cookies?.token || req.cookies?.jwt;
    if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Prohibit req.query?.token to prevent exposure in browser history and server logs
    return token || null;
  };

  const queryReq = { query: { token: 'exposed_query_token' }, cookies: {}, headers: {} };
  assert.equal(extractToken(queryReq), null, 'Tokens in URL query must not be accepted');

  const cookieReq = { cookies: { token: 'secure_cookie_token' }, headers: {} };
  assert.equal(extractToken(cookieReq), 'secure_cookie_token');

  const authHeaderReq = { cookies: {}, headers: { authorization: 'Bearer header_token' } };
  assert.equal(extractToken(authHeaderReq), 'header_token');
});


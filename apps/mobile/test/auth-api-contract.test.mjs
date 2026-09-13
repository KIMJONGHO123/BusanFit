import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('mobile auth API uses the server auth endpoint contract', async () => {
  const authSource = await readFile(new URL('../src/api/auth.ts', import.meta.url), 'utf8');

  assert.match(authSource, /post<SignupResponse>\('\/api\/user\/signup'/);
  assert.match(authSource, /post<LoginResponse>\('\/api\/user\/login'/);
  assert.match(authSource, /get<CurrentUserResponse>\('\/api\/user\/me'/);
  assert.match(authSource, /email: string/);
  assert.match(authSource, /accessToken: string/);
  assert.match(authSource, /tokenType: string/);
});

test('mobile API client sends JWTs with the Bearer authorization scheme', async () => {
  const clientSource = await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8');

  assert.match(clientSource, /baseURL: process\.env\.EXPO_PUBLIC_API_BASE_URL \?\? 'http:\/\/localhost:8080'/);
  assert.match(clientSource, /Authorization = `Bearer \$\{accessToken\}`/);
  assert.match(clientSource, /delete apiClient\.defaults\.headers\.common\.Authorization/);
});

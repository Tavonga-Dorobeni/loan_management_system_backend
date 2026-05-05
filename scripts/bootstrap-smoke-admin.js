// One-shot helper for the manual UI walk: registers a fresh admin via the
// live API using a self-signed bootstrap token. Mirrors the pattern in
// scripts/live-smoke.js so we get a known, fresh admin to log into the UI with.

const path = require('node:path');

require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env'),
});

const {
  initializeModels,
  setupAssociations,
} = require('../dist/common/database');
const { signAccessToken } = require('../dist/common/config/auth');
const { UserModel } = require('../dist/modules/users/model');

const API = 'http://localhost:3000/api/v1';
const SUFFIX = Date.now();
const EMAIL = `smoke-admin-${SUFFIX}@example.com`;
const PASSWORD = 'SmokePass123!';

(async () => {
  initializeModels();
  setupAssociations();

  const admin = await UserModel.findOne({
    where: { role: 'admin', status: 'active' },
    order: [['id', 'ASC']],
  });

  if (!admin) {
    console.error('No active admin in DB — cannot bootstrap.');
    process.exit(1);
  }

  const token = signAccessToken({
    sub: Number(admin.id),
    email: admin.email,
    role: admin.role,
  });

  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      firstName: 'Smoke',
      lastName: 'Admin',
      email: EMAIL,
      password: PASSWORD,
      role: 'admin',
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`register failed (${res.status}): ${body}`);
    process.exit(1);
  }

  console.log(JSON.stringify({ email: EMAIL, password: PASSWORD }));
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

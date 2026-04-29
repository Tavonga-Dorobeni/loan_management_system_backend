const assert = require('node:assert/strict');
const path = require('node:path');

require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env'),
});

const XLSX = require('xlsx');

const { createApp } = require('../dist/app');
const { bootstrapDatabase, closeDatabase, initializeModels, setupAssociations } = require('../dist/common/database');
const { signAccessToken } = require('../dist/common/config/auth');
const { sequelize } = require('../dist/common/config/database.config');
const { UserModel } = require('../dist/modules/users/model');

const HOST = '127.0.0.1';
const API_PREFIX = '/api/v1';
const SMOKE_PASSWORD = 'SmokePass123!';

let server;
let baseUrl;

const expectSuccessEnvelope = (payload, label) => {
  assert.equal(payload?.success, true, `${label} did not return a success envelope`);
  assert.ok('data' in payload, `${label} did not return a data payload`);
};

const createWorkbookBuffer = (rows) => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });
};

const request = async (pathname, options = {}) => {
  const headers = new Headers(options.headers || {});

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const init = {
    method: options.method || 'GET',
    headers,
    body: options.body,
  };

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof Blob) &&
    typeof options.body !== 'string' &&
    !Buffer.isBuffer(options.body)
  ) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${baseUrl}${pathname}`, init);
  return response;
};

const requestJson = async (pathname, options = {}) => {
  const response = await request(pathname, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (options.expectedStatus !== undefined) {
    assert.equal(
      response.status,
      options.expectedStatus,
      `${pathname} returned ${response.status}: ${text}`
    );
  } else {
    assert.ok(response.ok, `${pathname} returned ${response.status}: ${text}`);
  }

  return { response, payload };
};

const startServer = async () => {
  initializeModels();
  setupAssociations();
  await bootstrapDatabase();

  const app = createApp();

  await new Promise((resolve, reject) => {
    server = app.listen(0, HOST, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to resolve smoke server address'));
        return;
      }

      baseUrl = `http://${HOST}:${address.port}`;
      resolve();
    });

    server.on('error', reject);
  });
};

const stopServer = async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await closeDatabase();
};

const verifyObservabilitySchema = async () => {
  const [activityTables] = await sequelize.query("SHOW TABLES LIKE 'activity_logs'");
  const [notificationTables] = await sequelize.query(
    "SHOW TABLES LIKE 'notification_deliveries'"
  );
  const [loanIndexes] = await sequelize.query(
    "SHOW INDEX FROM loans WHERE Key_name IN ('idx_loans_borrower_id','idx_loans_status')"
  );
  const [repaymentIndexes] = await sequelize.query(
    "SHOW INDEX FROM repayments WHERE Key_name IN ('idx_repayments_loan_id','idx_repayments_transaction_date')"
  );

  assert.ok(activityTables.length > 0, 'activity_logs table is missing');
  assert.ok(
    notificationTables.length > 0,
    'notification_deliveries table is missing'
  );
  assert.ok(
    loanIndexes.some((row) => row.Key_name === 'idx_loans_borrower_id'),
    'idx_loans_borrower_id is missing'
  );
  assert.ok(
    loanIndexes.some((row) => row.Key_name === 'idx_loans_status'),
    'idx_loans_status is missing'
  );
  assert.ok(
    repaymentIndexes.some((row) => row.Key_name === 'idx_repayments_loan_id'),
    'idx_repayments_loan_id is missing'
  );
  assert.ok(
    repaymentIndexes.some(
      (row) => row.Key_name === 'idx_repayments_transaction_date'
    ),
    'idx_repayments_transaction_date is missing'
  );
};

const run = async () => {
  const suffix = Date.now();

  await startServer();
  await verifyObservabilitySchema();

  const admin = await UserModel.findOne({
    where: {
      role: 'admin',
      status: 'active',
    },
    order: [['id', 'ASC']],
  });
  assert.ok(admin, 'No active admin user exists for smoke bootstrap');

  const bootstrapToken = signAccessToken({
    sub: Number(admin.id),
    email: admin.email,
    role: admin.role,
  });

  const smokeEmail = `smoke-admin-${suffix}@example.com`;

  const registerResult = await requestJson(`${API_PREFIX}/auth/register`, {
    method: 'POST',
    token: bootstrapToken,
    expectedStatus: 201,
    body: {
      firstName: 'Smoke',
      lastName: 'Admin',
      email: smokeEmail,
      password: SMOKE_PASSWORD,
      role: 'admin',
    },
  });
  expectSuccessEnvelope(registerResult.payload, 'auth register');
  assert.equal(registerResult.payload.data.user.email, smokeEmail);

  const loginResult = await requestJson(`${API_PREFIX}/auth/login`, {
    method: 'POST',
    expectedStatus: 200,
    body: {
      email: smokeEmail,
      password: SMOKE_PASSWORD,
    },
  });
  expectSuccessEnvelope(loginResult.payload, 'auth login');
  const token = loginResult.payload.data.token;
  assert.ok(token, 'auth login did not return a token');

  const borrowerResult = await requestJson(`${API_PREFIX}/borrowers`, {
    method: 'POST',
    token,
    expectedStatus: 201,
    body: {
      firstName: 'Smoke',
      lastName: 'Borrower',
      ecNumber: `SMOKE-EC-${suffix}`,
      idNumber: `SMOKE-ID-${suffix}`,
      phoneNumber: '+15550001111',
      email: `borrower-${suffix}@example.com`,
    },
  });
  expectSuccessEnvelope(borrowerResult.payload, 'borrower create');
  const borrowerId = borrowerResult.payload.data.id;

  const kycForm = new FormData();
  kycForm.set('borrowerId', String(borrowerId));
  kycForm.set('documentType', 'payslip');
  kycForm.set(
    'file',
    new Blob([Buffer.from('%PDF-1.4 smoke document\n', 'utf8')], {
      type: 'application/pdf',
    }),
    'payslip.pdf'
  );

  const kycUploadResult = await requestJson(`${API_PREFIX}/borrower-kyc/upload`, {
    method: 'POST',
    token,
    expectedStatus: 201,
    body: kycForm,
  });
  expectSuccessEnvelope(kycUploadResult.payload, 'KYC upload');
  assert.ok(
    kycUploadResult.payload.data.signedUrl,
    'KYC upload did not return a signedUrl'
  );

  const kycListResult = await requestJson(
    `${API_PREFIX}/borrower-kyc/borrower/${borrowerId}`,
    {
      token,
      expectedStatus: 200,
    }
  );
  expectSuccessEnvelope(kycListResult.payload, 'KYC list');
  assert.ok(
    Array.isArray(kycListResult.payload.data.items),
    'KYC list did not return data.items'
  );
  assert.ok(
    kycListResult.payload.data.items.some((entry) => entry.documentType === 'payslip'),
    'KYC list did not include the uploaded payslip'
  );

  const loanReference = `SMOKE-LOAN-${suffix}`;
  const loanResult = await requestJson(`${API_PREFIX}/loans`, {
    method: 'POST',
    token,
    expectedStatus: 201,
    body: {
      borrowerId,
      referenceNumber: loanReference,
      type: 'PERSONAL',
      status: 'SUCCESS',
      startDate: '2026-01-01',
      endDate: '2026-06-01',
      disbursementDate: null,
      repaymentAmount: 100,
      totalAmount: 500,
      amountPaid: 0,
      amountDue: 500,
      message: null,
    },
  });
  expectSuccessEnvelope(loanResult.payload, 'loan create');
  const loanId = loanResult.payload.data.id;

  const repaymentResult = await requestJson(`${API_PREFIX}/repayments`, {
    method: 'POST',
    token,
    expectedStatus: 201,
    body: {
      loanId,
      amount: 100,
      transactionDate: new Date().toISOString(),
    },
  });
  expectSuccessEnvelope(repaymentResult.payload, 'repayment create');
  assert.equal(
    repaymentResult.payload.data.status,
    'CORRECT',
    'repayment create did not derive CORRECT status'
  );

  const intakeReference = `SMOKE-INTAKE-${suffix}`;
  const intakeWorkbook = createWorkbookBuffer([
    ['Reference', 'ID Number', 'EC Number', 'Type', 'Start', 'End', 'Repayment', 'Unused', 'Total', 'First Name', 'Last Name'],
    [
      intakeReference,
      `SMOKE-INTAKE-ID-${suffix}`,
      `SMOKE-INTAKE-EC-${suffix}`,
      'PERSONAL',
      '2026-01-01',
      '2026-06-01',
      10000,
      '',
      50000,
      'Import',
      'Borrower',
    ],
  ]);
  const intakeForm = new FormData();
  intakeForm.set(
    'file',
    new Blob([intakeWorkbook], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'smoke-intake.xlsx'
  );

  const intakeResult = await requestJson(`${API_PREFIX}/loans/import/excel`, {
    method: 'POST',
    token,
    expectedStatus: 200,
    body: intakeForm,
  });
  expectSuccessEnvelope(intakeResult.payload, 'loan intake import');
  assert.equal(intakeResult.payload.data.successCount, 1);
  assert.equal(intakeResult.payload.data.failureCount, 0);

  const approvalWorkbook = createWorkbookBuffer([
    ['A', 'B', 'Reference', 'D', 'E', 'F', 'Status', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Message'],
    ['', '', intakeReference, '', '', '', 'SUCCESS', '', '', '', '', '', '', '', 'Approved in smoke'],
  ]);
  const approvalForm = new FormData();
  approvalForm.set(
    'file',
    new Blob([approvalWorkbook], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'smoke-approvals.xlsx'
  );

  const approvalResult = await requestJson(
    `${API_PREFIX}/loans/import/approvals/excel`,
    {
      method: 'POST',
      token,
      expectedStatus: 200,
      body: approvalForm,
    }
  );
  expectSuccessEnvelope(approvalResult.payload, 'loan approval import');
  assert.equal(approvalResult.payload.data.successCount, 1);

  const importedLoanSearch = await requestJson(
    `${API_PREFIX}/loans?search=${encodeURIComponent(intakeReference)}`,
    {
      token,
      expectedStatus: 200,
    }
  );
  expectSuccessEnvelope(importedLoanSearch.payload, 'loan search after approval import');
  const importedLoan = importedLoanSearch.payload.data.items.find(
    (entry) => entry.referenceNumber === intakeReference
  );
  assert.ok(importedLoan, 'Approved import loan was not found via /loans');
  assert.equal(importedLoan.status, 'SUCCESS');
  assert.equal(importedLoan.amountPaid, 0);
  assert.ok(importedLoan.amountDue > 0, 'Approved import loan did not receive amountDue');

  const repaymentImportWorkbook = createWorkbookBuffer([
    ['A', 'B', 'Reference', 'D', 'E', 'Transaction Date', 'Amount'],
    ['', '', intakeReference, '', '', '2026-05-01', 100],
  ]);
  const repaymentImportForm = new FormData();
  repaymentImportForm.set(
    'file',
    new Blob([repaymentImportWorkbook], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'smoke-repayments.xlsx'
  );

  const repaymentImportResult = await requestJson(
    `${API_PREFIX}/loans/import/repayments/excel`,
    {
      method: 'POST',
      token,
      expectedStatus: 200,
      body: repaymentImportForm,
    }
  );
  expectSuccessEnvelope(repaymentImportResult.payload, 'loan repayment import');
  assert.equal(repaymentImportResult.payload.data.successCount, 1);

  const importedLoanDetails = await requestJson(
    `${API_PREFIX}/loans/${importedLoan.id}/details`,
    {
      token,
      expectedStatus: 200,
    }
  );
  expectSuccessEnvelope(importedLoanDetails.payload, 'loan details after repayment import');
  assert.ok(
    importedLoanDetails.payload.data.balance.amountPaid >= 100,
    'Repayment import did not update amountPaid'
  );

  const dashboardResult = await requestJson(
    `${API_PREFIX}/dashboard/portfolio-summary`,
    {
      token,
      expectedStatus: 200,
    }
  );
  expectSuccessEnvelope(dashboardResult.payload, 'dashboard summary');
  assert.ok(
    Array.isArray(dashboardResult.payload.data.recentImports),
    'dashboard recentImports is not an array'
  );
  assert.ok(
    Array.isArray(dashboardResult.payload.data.approvalTrend),
    'dashboard approvalTrend is not an array'
  );
  assert.ok(
    Array.isArray(dashboardResult.payload.data.repaymentTrend),
    'dashboard repaymentTrend is not an array'
  );

  const reportResult = await requestJson(`${API_PREFIX}/reports/loan-portfolio`, {
    token,
    expectedStatus: 200,
  });
  expectSuccessEnvelope(reportResult.payload, 'loan portfolio report');
  assert.ok(Array.isArray(reportResult.payload.data.rows), 'report data.rows is not an array');

  const csvReportResponse = await request(`${API_PREFIX}/reports/loan-portfolio?format=csv`, {
    token,
  });
  assert.equal(csvReportResponse.status, 200, 'CSV report export failed');
  assert.ok(
    (csvReportResponse.headers.get('content-type') || '').includes('text/csv'),
    'CSV report did not return text/csv'
  );
  assert.ok(
    (csvReportResponse.headers.get('content-disposition') || '').includes('attachment; filename='),
    'CSV report did not return an attachment disposition'
  );

  const activityResult = await requestJson(
    `${API_PREFIX}/activity-logs?entityType=import&sourceType=import&pageSize=20`,
    {
      token,
      expectedStatus: 200,
    }
  );
  expectSuccessEnvelope(activityResult.payload, 'activity logs');
  assert.ok(
    activityResult.payload.data.items.some(
      (entry) => entry.action === 'loan.import.repayment.completed'
    ),
    'Activity logs did not include the repayment import event'
  );

  const notificationsResult = await requestJson(
    `${API_PREFIX}/notifications/deliveries?pageSize=50`,
    {
      token,
      expectedStatus: 200,
    }
  );
  expectSuccessEnvelope(notificationsResult.payload, 'notification deliveries');
  assert.ok(
    notificationsResult.payload.data.items.some(
      (entry) =>
        entry.eventType === 'loan.created' ||
        entry.eventType === 'user.registered' ||
        entry.eventType === 'borrower.kyc.uploaded'
    ),
    'Notification deliveries did not include smoke-generated events'
  );

  console.log('Live smoke completed successfully.');
};

(async () => {
  try {
    await run();
  } finally {
    await stopServer().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

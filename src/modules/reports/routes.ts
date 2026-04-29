import { Router } from 'express';

import { authMiddleware, requireAnyAuthenticatedRole } from '@/common/middleware/auth.middleware';
import { asyncHandler, validate } from '@/common/utils/validation';
import { reportsController } from '@/modules/reports/controller';
import { reportQuerySchema } from '@/modules/reports/validators';

const router = Router();

/**
 * @openapi
 * /api/v1/reports/loan-portfolio:
 *   get:
 *     tags: [Reports]
 *     summary: Loan portfolio report
 *     description: Supports `format=json|csv|xlsx`. JSON responses return a success envelope whose `data.rows` contains the report rows; CSV and XLSX responses stream attachments.
 *     security:
 *       - bearerAuth: []
 * /api/v1/reports/borrower-register:
 *   get:
 *     tags: [Reports]
 *     summary: Borrower register report
 *     description: Supports `format=json|csv|xlsx`. JSON responses return a success envelope whose `data.rows` contains the report rows; CSV and XLSX responses stream attachments.
 *     security:
 *       - bearerAuth: []
 * /api/v1/reports/kyc-completeness:
 *   get:
 *     tags: [Reports]
 *     summary: KYC completeness report
 *     description: Supports `format=json|csv|xlsx`. JSON responses return a success envelope whose `data.rows` contains the report rows; CSV and XLSX responses stream attachments.
 *     security:
 *       - bearerAuth: []
 * /api/v1/reports/disbursement:
 *   get:
 *     tags: [Reports]
 *     summary: Disbursement report
 *     description: Supports `format=json|csv|xlsx`. JSON responses return a success envelope whose `data.rows` contains the report rows; CSV and XLSX responses stream attachments.
 *     security:
 *       - bearerAuth: []
 * /api/v1/reports/approval-outcome:
 *   get:
 *     tags: [Reports]
 *     summary: Approval outcome report
 *     description: Supports `format=json|csv|xlsx`. JSON responses return a success envelope whose `data.rows` contains the report rows; CSV and XLSX responses stream attachments.
 *     security:
 *       - bearerAuth: []
 * /api/v1/reports/repayment:
 *   get:
 *     tags: [Reports]
 *     summary: Repayment report
 *     description: Supports `format=json|csv|xlsx`. JSON responses return a success envelope whose `data.rows` contains the report rows; CSV and XLSX responses stream attachments.
 *     security:
 *       - bearerAuth: []
 * /api/v1/reports/arrears:
 *   get:
 *     tags: [Reports]
 *     summary: Arrears report
 *     description: Supports `format=json|csv|xlsx`. JSON responses return a success envelope whose `data.rows` contains the report rows; CSV and XLSX responses stream attachments.
 *     security:
 *       - bearerAuth: []
 * /api/v1/reports/collections-performance:
 *   get:
 *     tags: [Reports]
 *     summary: Collections performance report
 *     description: Supports `format=json|csv|xlsx`. JSON responses return a success envelope whose `data.rows` contains the report rows; CSV and XLSX responses stream attachments.
 *     security:
 *       - bearerAuth: []
 * /api/v1/reports/import-exceptions:
 *   get:
 *     tags: [Reports]
 *     summary: Import exceptions report
 *     description: Supports `format=json|csv|xlsx`. JSON responses return a success envelope whose `data.rows` contains the report rows; CSV and XLSX responses stream attachments.
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/loan-portfolio',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: reportQuerySchema }),
  asyncHandler(reportsController.loanPortfolio.bind(reportsController))
);
router.get(
  '/borrower-register',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: reportQuerySchema }),
  asyncHandler(reportsController.borrowerRegister.bind(reportsController))
);
router.get(
  '/kyc-completeness',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: reportQuerySchema }),
  asyncHandler(reportsController.kycCompleteness.bind(reportsController))
);
router.get(
  '/disbursement',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: reportQuerySchema }),
  asyncHandler(reportsController.disbursement.bind(reportsController))
);
router.get(
  '/approval-outcome',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: reportQuerySchema }),
  asyncHandler(reportsController.approvalOutcome.bind(reportsController))
);
router.get(
  '/repayment',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: reportQuerySchema }),
  asyncHandler(reportsController.repayment.bind(reportsController))
);
router.get(
  '/arrears',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: reportQuerySchema }),
  asyncHandler(reportsController.arrears.bind(reportsController))
);
router.get(
  '/collections-performance',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: reportQuerySchema }),
  asyncHandler(reportsController.collectionsPerformance.bind(reportsController))
);
router.get(
  '/import-exceptions',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: reportQuerySchema }),
  asyncHandler(reportsController.importExceptions.bind(reportsController))
);

export default router;

import { Router } from 'express';
import multer from 'multer';

import {
  authMiddleware,
  requireAnyAuthenticatedRole,
  requireRole,
} from '@/common/middleware/auth.middleware';
import { Roles } from '@/common/types/roles';
import { asyncHandler, validate } from '@/common/utils/validation';
import { loanController } from '@/modules/loans/controller';
import {
  createLoanSchema,
  loanIdParamSchema,
  loansQuerySchema,
  updateLoanSchema,
} from '@/modules/loans/validators';
import { repaymentsQuerySchema } from '@/modules/repayments/validators';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/**
 * @openapi
 * /api/v1/loans:
 *   get:
 *     tags: [Loans]
 *     summary: List loans
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loans retrieved successfully
 *   post:
 *     tags: [Loans]
 *     summary: Create a loan
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - borrowerId
 *               - referenceNumber
 *               - type
 *               - status
 *               - startDate
 *               - endDate
 *               - repaymentAmount
 *               - totalAmount
 *             properties:
 *               borrowerId:
 *                 type: integer
 *               referenceNumber:
 *                 type: string
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               disbursementDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               repaymentAmount:
 *                 type: number
 *               totalAmount:
 *                 type: number
 *               amountPaid:
 *                 type: number
 *                 nullable: true
 *               amountDue:
 *                 type: number
 *                 nullable: true
 *               message:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Loan created successfully
 * /api/v1/loans/{loan_id}:
 *   get:
 *     tags: [Loans]
 *     summary: Get loan by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loan_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Loan retrieved successfully
 *   put:
 *     tags: [Loans]
 *     summary: Update loan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loan_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               borrowerId:
 *                 type: integer
 *               referenceNumber:
 *                 type: string
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               disbursementDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               repaymentAmount:
 *                 type: number
 *               totalAmount:
 *                 type: number
 *               amountPaid:
 *                 type: number
 *                 nullable: true
 *               amountDue:
 *                 type: number
 *                 nullable: true
 *               message:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Loan updated successfully
 *   delete:
 *     tags: [Loans]
 *     summary: Delete loan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loan_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Loan deleted successfully
 * /api/v1/loans/import/excel:
 *   post:
 *     tags: [Loans]
 *     summary: Import loans from an Excel file. First row is treated as headers.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import completed
 * /api/v1/loans/import/approvals/excel:
 *   post:
 *     tags: [Loans]
 *     summary: Import loan approvals from an Excel file using C as reference, G as status, and O as message.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Loan approval import completed
 * /api/v1/loans/import/repayments/excel:
 *   post:
 *     tags: [Loans]
 *     summary: Import loan repayments from Excel using C as reference number, F as transaction date, and G as amount.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Loan repayment import completed
 */
router.get(
  '/',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: loansQuerySchema }),
  asyncHandler(loanController.list.bind(loanController))
);
router.post(
  '/import/excel',
  authMiddleware,
  requireRole(Roles.ADMIN, Roles.LOAN_OFFICER),
  upload.single('file'),
  asyncHandler(loanController.importExcel.bind(loanController))
);
router.post(
  '/import/approvals/excel',
  authMiddleware,
  requireRole(Roles.ADMIN, Roles.CREDIT_ANALYST),
  upload.single('file'),
  asyncHandler(loanController.importApprovalsExcel.bind(loanController))
);
router.post(
  '/import/repayments/excel',
  authMiddleware,
  requireRole(Roles.ADMIN, Roles.COLLECTIONS_OFFICER),
  upload.single('file'),
  asyncHandler(loanController.importRepaymentsExcel.bind(loanController))
);
router.post(
  '/',
  authMiddleware,
  requireRole(Roles.ADMIN, Roles.LOAN_OFFICER),
  validate({ body: createLoanSchema }),
  asyncHandler(loanController.create.bind(loanController))
);
router.get(
  '/:loan_id/details',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ params: loanIdParamSchema }),
  asyncHandler(loanController.getDetails.bind(loanController))
);
router.get(
  '/:loan_id/repayments',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ params: loanIdParamSchema, query: repaymentsQuerySchema }),
  asyncHandler(loanController.listRepayments.bind(loanController))
);
router.get(
  '/:loan_id',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ params: loanIdParamSchema }),
  asyncHandler(loanController.getById.bind(loanController))
);
router.put(
  '/:loan_id',
  authMiddleware,
  requireRole(Roles.ADMIN, Roles.LOAN_OFFICER, Roles.CREDIT_ANALYST),
  validate({ params: loanIdParamSchema, body: updateLoanSchema }),
  asyncHandler(loanController.update.bind(loanController))
);
router.delete(
  '/:loan_id',
  authMiddleware,
  requireRole(Roles.ADMIN),
  validate({ params: loanIdParamSchema }),
  asyncHandler(loanController.delete.bind(loanController))
);

export default router;

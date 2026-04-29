import type { Request, Response } from 'express';

import { Roles } from '@/common/types/roles';
import { ForbiddenError } from '@/common/utils/errors';
import { sendSuccess } from '@/common/utils/response';
import { ReportFormat, sendAttachment, toCsvBuffer, toXlsxBuffer } from '@/common/utils/export';
import { reportingService, type ReportQuery, type ReportResult } from '@/modules/reports/services/reporting.service';

const buildReportQuery = (req: Request): ReportQuery => ({
  format:
    typeof req.query.format === 'string'
      ? (req.query.format as ReportFormat)
      : 'json',
  from: typeof req.query.from === 'string' ? req.query.from : undefined,
  to: typeof req.query.to === 'string' ? req.query.to : undefined,
  borrowerId:
    typeof req.query.borrowerId === 'string' ? Number(req.query.borrowerId) : undefined,
  loanId: typeof req.query.loanId === 'string' ? Number(req.query.loanId) : undefined,
  status: typeof req.query.status === 'string' ? req.query.status : undefined,
  type: typeof req.query.type === 'string' ? req.query.type : undefined,
});

export class ReportsController {
  private ensureExportAllowed(req: Request, format: ReportFormat): void {
    if (format !== 'json' && req.user?.role === Roles.CUSTOMER_SUPPORT) {
      throw new ForbiddenError('You do not have permission to export this report');
    }
  }

  private respondWithReport(
    req: Request,
    res: Response,
    report: ReportResult,
    message: string
  ): Response {
    const format = buildReportQuery(req).format ?? 'json';
    this.ensureExportAllowed(req, format);

    if (format === 'json') {
      return sendSuccess(res, { rows: report.rows }, message);
    }

    if (format === 'csv') {
      return sendAttachment(res, {
        contentType: 'text/csv',
        extension: 'csv',
        fileName: report.slug,
        buffer: toCsvBuffer(report.rows),
      });
    }

    return sendAttachment(res, {
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
      fileName: report.slug,
      buffer: toXlsxBuffer(report.rows),
    });
  }

  async portfolioSummary(req: Request, res: Response): Promise<Response> {
    const summary = await reportingService.getPortfolioSummary(buildReportQuery(req));
    return sendSuccess(res, summary, 'Portfolio summary retrieved successfully');
  }

  async loanPortfolio(req: Request, res: Response): Promise<Response> {
    const report = await reportingService.getLoanPortfolio(buildReportQuery(req));
    return this.respondWithReport(req, res, report, 'Loan portfolio report retrieved successfully');
  }

  async borrowerRegister(req: Request, res: Response): Promise<Response> {
    const report = await reportingService.getBorrowerRegister();
    return this.respondWithReport(req, res, report, 'Borrower register report retrieved successfully');
  }

  async kycCompleteness(req: Request, res: Response): Promise<Response> {
    const report = await reportingService.getKycCompleteness();
    return this.respondWithReport(req, res, report, 'KYC completeness report retrieved successfully');
  }

  async disbursement(req: Request, res: Response): Promise<Response> {
    const report = await reportingService.getDisbursementReport(buildReportQuery(req));
    return this.respondWithReport(req, res, report, 'Disbursement report retrieved successfully');
  }

  async approvalOutcome(req: Request, res: Response): Promise<Response> {
    const report = await reportingService.getApprovalOutcomeReport(buildReportQuery(req));
    return this.respondWithReport(req, res, report, 'Approval outcome report retrieved successfully');
  }

  async repayment(req: Request, res: Response): Promise<Response> {
    const report = await reportingService.getRepaymentReport(buildReportQuery(req));
    return this.respondWithReport(req, res, report, 'Repayment report retrieved successfully');
  }

  async arrears(req: Request, res: Response): Promise<Response> {
    const report = await reportingService.getArrearsReport();
    return this.respondWithReport(req, res, report, 'Arrears report retrieved successfully');
  }

  async collectionsPerformance(req: Request, res: Response): Promise<Response> {
    const report = await reportingService.getCollectionsPerformance();
    return this.respondWithReport(
      req,
      res,
      report,
      'Collections performance report retrieved successfully'
    );
  }

  async importExceptions(req: Request, res: Response): Promise<Response> {
    const report = await reportingService.getImportExceptions();
    return this.respondWithReport(req, res, report, 'Import exceptions report retrieved successfully');
  }
}

export const reportsController = new ReportsController();

import type { Request, Response } from 'express';

import { ForbiddenError } from '@/common/utils/errors';
import { Roles } from '@/common/types/roles';
import { reportsController } from '@/modules/reports/controller';
import { reportingService } from '@/modules/reports/services/reporting.service';

const createResponse = (): Response =>
  ({
    headers: {} as Record<string, string>,
    setHeader: jest.fn(function setHeader(this: Response & { headers: Record<string, string> }, key: string, value: string) {
      this.headers[key] = value;
      return this;
    }),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('ReportsController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('wraps JSON report responses in data.rows', async () => {
    jest.spyOn(reportingService, 'getLoanPortfolio').mockResolvedValue({
      slug: 'loan-portfolio',
      rows: [{ referenceNumber: 'LN-001' }],
    });

    const req = {
      query: {
        format: 'json',
      },
      user: {
        id: 1,
        email: 'admin@example.com',
        role: Roles.ADMIN,
      },
    } as unknown as Request;
    const res = createResponse();

    await reportsController.loanPortfolio(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        rows: [{ referenceNumber: 'LN-001' }],
      },
      message: 'Loan portfolio report retrieved successfully',
    });
  });

  it('denies csv export for customer support users', async () => {
    jest.spyOn(reportingService, 'getLoanPortfolio').mockResolvedValue({
      slug: 'loan-portfolio',
      rows: [{ referenceNumber: 'LN-001' }],
    });

    const req = {
      query: {
        format: 'csv',
      },
      user: {
        id: 9,
        email: 'support@example.com',
        role: Roles.CUSTOMER_SUPPORT,
      },
    } as unknown as Request;

    await expect(
      reportsController.loanPortfolio(req, createResponse())
    ).rejects.toThrow(ForbiddenError);
  });

  it('streams csv exports with attachment headers for allowed users', async () => {
    jest.spyOn(reportingService, 'getLoanPortfolio').mockResolvedValue({
      slug: 'loan-portfolio',
      rows: [{ referenceNumber: 'LN-001', status: 'PENDING' }],
    });

    const req = {
      query: {
        format: 'csv',
      },
      user: {
        id: 1,
        email: 'admin@example.com',
        role: Roles.ADMIN,
      },
    } as unknown as Request;
    const res = createResponse() as Response & { headers: Record<string, string> };

    await reportsController.loanPortfolio(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.headers['Content-Disposition']).toMatch(
      /^attachment; filename="loan-portfolio-.*\.csv"$/
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('streams xlsx exports with attachment headers for allowed users', async () => {
    jest.spyOn(reportingService, 'getLoanPortfolio').mockResolvedValue({
      slug: 'loan-portfolio',
      rows: [{ referenceNumber: 'LN-001', status: 'PENDING' }],
    });

    const req = {
      query: {
        format: 'xlsx',
      },
      user: {
        id: 1,
        email: 'admin@example.com',
        role: Roles.ADMIN,
      },
    } as unknown as Request;
    const res = createResponse() as Response & { headers: Record<string, string> };

    await reportsController.loanPortfolio(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.headers['Content-Disposition']).toMatch(
      /^attachment; filename="loan-portfolio-.*\.xlsx"$/
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
  });
});

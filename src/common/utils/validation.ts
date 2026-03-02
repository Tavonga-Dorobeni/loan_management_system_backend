import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ObjectSchema } from 'joi';

import { ValidationError } from '@/common/utils/errors';

interface ValidationTargets {
  body?: ObjectSchema;
  params?: ObjectSchema;
  query?: ObjectSchema;
}

export const validate = (targets: ValidationTargets): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (targets.params) {
        const { value, error } = targets.params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (error) {
          throw new ValidationError(
            error.details.map((detail) => detail.message).join(', ')
          );
        }
        req.params = value;
      }

      if (targets.query) {
        const { value, error } = targets.query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (error) {
          throw new ValidationError(
            error.details.map((detail) => detail.message).join(', ')
          );
        }
        req.query = value;
      }

      if (targets.body) {
        const { value, error } = targets.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (error) {
          throw new ValidationError(
            error.details.map((detail) => detail.message).join(', ')
          );
        }
        req.body = value;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const asyncHandler =
  <T extends RequestHandler>(handler: T): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

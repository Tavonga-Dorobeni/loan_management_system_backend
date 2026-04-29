import Joi from 'joi';

export interface ListQueryParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ListEnvelope<T> {
  items: T[];
  pagination: PaginationMeta;
}

export const createListQuerySchema = (
  sortFields: string[],
  extraFields: Record<string, Joi.Schema> = {}
): Joi.ObjectSchema => {
  return Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string()
      .valid(...sortFields)
      .optional(),
    sortOrder: Joi.string().valid('asc', 'desc').insensitive().default('desc'),
    search: Joi.string().trim().allow('').optional(),
    ...extraFields,
  });
};

export const toListQueryParams = (
  query: Record<string, unknown>
): ListQueryParams => {
  return {
    page: Number(query.page ?? 1),
    pageSize: Number(query.pageSize ?? 20),
    sortBy: typeof query.sortBy === 'string' ? query.sortBy : undefined,
    sortOrder:
      typeof query.sortOrder === 'string' &&
      query.sortOrder.toLowerCase() === 'asc'
        ? 'asc'
        : 'desc',
    search:
      typeof query.search === 'string' && query.search.trim().length > 0
        ? query.search.trim()
        : undefined,
  };
};

export const buildListEnvelope = <T>(
  items: T[],
  page: number,
  pageSize: number,
  totalItems: number
): ListEnvelope<T> => {
  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  };
};

export const getOffset = (page: number, pageSize: number): number => {
  return (page - 1) * pageSize;
};

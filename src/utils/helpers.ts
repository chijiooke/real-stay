import { Types } from 'mongoose';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const generateOtp = (length: number = 6): string => {
  const min = Math.pow(10, length - 1); // Smallest number with given length
  const max = Math.pow(10, length) - 1; // Largest number with given length
  return Math.floor(min + Math.random() * (max - min)).toString();
};

export function buildSearchQuery(search: string, fields: string[]) {
  if (!search || !fields.length) return {};

  const regex = { $regex: search, $options: 'i' };

  return {
    $or: fields.map((field) => ({ [field]: regex })),
  };
}

export function normalizeObjectIdFields(
  filter: Record<string, any>,
  objectIdFields: string[],
): Record<string, any> {
  const normalizedFilter: Record<string, any> = { ...filter };

  for (const field of objectIdFields) {
    if (
      normalizedFilter[field] &&
      Types.ObjectId.isValid(normalizedFilter[field])
    ) {
      normalizedFilter[field] = new Types.ObjectId(normalizedFilter[field]);
    }
  }

  return normalizedFilter;
}

export function getPagingParameters(filter: Record<string, string> = {}): {
  currentPage: number;
  skip: number;
  limit: number;
} {
  let page: number = 1;
  let limit: number = 10;

  if (filter['page_size']) {
    limit = parseInt(filter['page_size'], 10);
    delete filter['page_size']; // Remove limit from filter to avoid conflicts
  }

  if (filter['page']) {
    page = parseInt(filter['page'], 10);
    delete filter['page']; // Remove page from filter to avoid conflicts
  }

  const skip = (page - 1) * limit;
  return { skip, limit, currentPage: page };
}

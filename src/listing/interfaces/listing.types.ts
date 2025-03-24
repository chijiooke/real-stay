import { ListingDocument } from '../schemas/listing.schema';

export interface PaginationMetadata {
  total_items: number;
  total_pages: number;
  current_page: number;
  limit: number;
}

export interface SavedListingResponse {
  listings: ListingDocument[];
  pagination: PaginationMetadata;
}

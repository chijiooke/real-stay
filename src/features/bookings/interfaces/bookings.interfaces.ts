export enum BookingStatusEnum {
  PENDING = 'PENDING',
  RESERVED = 'RESERVED',
  BOOKED = 'BOOKED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

export interface IBookingReservationReviewProps {
  status: BookingStatusEnum;
  bookingId: string;
  reviewerId: string;
}

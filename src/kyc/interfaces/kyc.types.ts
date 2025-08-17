export interface IDojahIdentityResponse {
  entity: Identity;
}

export interface Identity {
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string; // ISO date string (YYYY-MM-DD)
  phone_number: string;
  photo: string; // base64 string
  gender: 'M' | 'F';
  customer: string; // UUID
}

export interface IDojahIdentityResponse {
  entity: Identity;
}

export interface Identity {
  first_name: string;
  last_name: string;
  middle_name?: string; // optional if it may not always be provided
  gender: 'M' | 'F' | string; // restrictable if only M/F are valid
  image: string; // base64 or image path
  phone_number: string;
  date_of_birth: string; // ISO date format
  nin: string;
  selfie_verification: {
    confidence_value: number;
    match: boolean;
  };
}

export interface DojahKYCResponse {
  entity: Identity;
}

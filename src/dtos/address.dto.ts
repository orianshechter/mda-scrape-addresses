export interface Location {
    lat: number;
    lng: number;
}

export interface DonationTime {
    timestamp_start: string;
    timestamp_end: string;
    schedulingUrl: string;
}

export interface AddressDto {
    unformatted: string;
    location: Location;
    formatted: string;
    city: string;
}
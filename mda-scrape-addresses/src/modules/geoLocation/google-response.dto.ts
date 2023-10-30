export interface GoogleResponseDto {
    status: string;
    address: string;
    results: {
        geometry: {
            location: {
                lat: number,
                lng: number
            }
        },
        formatted_address: string;
    }[]
}
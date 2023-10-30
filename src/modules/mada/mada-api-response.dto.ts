export interface MadaApiResponseDto {
    ErrorCode: string | null;
    ErrorMsg: string;
    Success: boolean;
    Result: string; // string json of MadaAddressDto
}
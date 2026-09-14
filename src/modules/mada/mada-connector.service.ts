import { MadaAddressDto } from './mada-address.dto';
import { MadaApiResponseDto } from './mada-api-response.dto';
import { MadaAddressAggregatedDto } from './mada-address-aggregated.dto';

export class MadaConnectorService {
    private static instance: MadaConnectorService;
    private API_URL = 'https://www.mdais.org/umbraco/api/invoker/execute';

    private constructor() { }

    public static getInstance(): MadaConnectorService {
        if (!MadaConnectorService.instance) {
            MadaConnectorService.instance = new MadaConnectorService();
        }

        return MadaConnectorService.instance;
    }

    async getAddresses(daysAhead: number): Promise<MadaAddressAggregatedDto[]> {
        const rawAddresses = await this.getRawAddresses();
        const validDatesRawAddresses = rawAddresses.filter(
            address => this.isValidAddress(address) && this.isOnTheNextDays(daysAhead, address.DateDonation)
        );
        return Array.from(this.groupByAddress(validDatesRawAddresses).values());
    }

    private async getRawAddresses(): Promise<MadaAddressDto[]> {
        const madaResponse =
            await fetch(this.API_URL, {
                "headers": {
                    "content-type": "application/json",
                    "Referer": "https://www.mdais.org/blood-donation",
                    // Adding User-Agent to mimic a real browser. Helps bypass basic WAF/Bot protection.
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                "body": "{\"RequestHeader\":{\"Application\":101,\"Module\":\"BloodBank\",\"Function\":\"GetAllDetailsDonations\",\"Token\":\"\"},\"RequestData\":\"\"}",
                "method": "POST"
            });

        if (!madaResponse.ok) {
            // --- START OF ERROR LOGGING ---
            console.error("❌ --- START MADA API ERROR --- ❌");
            console.error(`HTTP Status Code: ${madaResponse.status} ${madaResponse.statusText}`);
            
            // Log headers to see if a firewall (like Cloudflare/Imperva) is blocking the request
            const responseHeaders: Record<string, string> = {};
            madaResponse.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            console.error("Response Headers:", JSON.stringify(responseHeaders, null, 2));

            try {
                // Attempt to read the error page/message from the server
                const errorBody = await madaResponse.text();
                console.error("Response Body:", errorBody);
            } catch (e) {
                console.error("Could not read response body.");
            }
            console.error("❌ --- END MADA API ERROR --- ❌");
            // --- END OF ERROR LOGGING ---

            throw new Error(`Error fetching addresses from mada. HTTP Status: ${madaResponse.status}`);
        }
        
        const madaResponseJson: MadaApiResponseDto = await madaResponse.json() as MadaApiResponseDto;
        return JSON.parse(madaResponseJson.Result);
    }

    private groupByAddress(rawAddresses: MadaAddressDto[]): Map<string, MadaAddressAggregatedDto> {
        const aggregatedAddressesMap = new Map<string, MadaAddressAggregatedDto>();

        for (const rawAddress of rawAddresses) {
            const key = `${rawAddress.Name}-${rawAddress.City}-${rawAddress.Street}-${rawAddress.NumHouse}`;
            let currentAddress = aggregatedAddressesMap.get(key);
            if (currentAddress) {
                currentAddress.times.push({
                    timestamp_start: this.getTimeStamp(rawAddress.DateDonation, rawAddress.FromHour),
                    timestamp_end: this.getTimeStamp(rawAddress.DateDonation, rawAddress.ToHour),
                    schedulingUrl: rawAddress.SchedulingURL.trim()
                });
            } else {
                currentAddress = {
                    name: rawAddress.Name.trim(),
                    city: rawAddress.City.trim(),
                    street: rawAddress.Street.trim(),
                    numHouse: rawAddress.NumHouse.trim(),
                    accountType: rawAddress.AccountType,
                    times: [{
                        timestamp_start: this.getTimeStamp(rawAddress.DateDonation, rawAddress.FromHour),
                        timestamp_end: this.getTimeStamp(rawAddress.DateDonation, rawAddress.ToHour),
                        schedulingUrl: rawAddress.SchedulingURL.trim()
                    }],
                };
                aggregatedAddressesMap.set(key, currentAddress);
            }
        }

        return aggregatedAddressesMap;
    }

    private getTimeStamp(dateDonation: string, hour: string): string {
        let normalizedHour = hour.trim();

        if (/^\d{3,4}$/.test(normalizedHour)) {
            normalizedHour = normalizedHour.padStart(4, '0');
            normalizedHour = `${normalizedHour.slice(0, 2)}:${normalizedHour.slice(2)}`;
        } else if (/^\d{1,2}:\d{2}$/.test(normalizedHour)) {
            const [hours, minutes] = normalizedHour.split(':');
            normalizedHour = `${hours.padStart(2, '0')}:${minutes}`;
        }

        const dateTimeString = `${dateDonation.split('T')[0]}T${normalizedHour}:00`;
        return new Date(dateTimeString).toISOString();
    }

    private isOnTheNextDays(maxDaysDiff: number, timestamp: string): boolean {
        let date = new Date(timestamp);
        let dateNow = new Date(Date.now());

        // To calculate the time difference of two dates
        let differenceInTime = date.getTime() - dateNow.getTime();

        // To calculate the no. of days between two dates
        let differenceInDays = differenceInTime / (1000 * 3600 * 24);
        return differenceInDays <= maxDaysDiff;
    }

    private isValidAddress(address: MadaAddressDto): boolean {
        return (address.Name !== '' || address.City !== '' || address.Street !== '');
    }

}

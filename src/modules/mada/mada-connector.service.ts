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
            address => this.isOnTheNextDays(daysAhead, address.DateDonation)
        );
        return Array.from(this.groupByAddress(validDatesRawAddresses).values());
    }

    private async getRawAddresses(): Promise<MadaAddressDto[]> {
        const madaResponse =
            await fetch(this.API_URL, {
                "headers": {
                    "content-type": "application/json",
                    "Referer": "https://www.mdais.org/blood-donation",
                },
                "body": "{\"RequestHeader\":{\"Application\":101,\"Module\":\"BloodBank\",\"Function\":\"GetAllDetailsDonations\",\"Token\":\"\"},\"RequestData\":\"\"}",
                "method": "POST"
            });
        if(!madaResponse.ok) {
            throw new Error('Error fetching addresses from mada');
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
        // Parse the DateDonation and FromHour into Date objects
        const dateDonationDate = new Date(dateDonation);
        const fromHourParts = hour.split(":");
        const fromHourDate = new Date(dateDonationDate);
        fromHourDate.setHours(parseInt(fromHourParts[0], 10), parseInt(fromHourParts[1], 10));

        return fromHourDate.toISOString();
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

}
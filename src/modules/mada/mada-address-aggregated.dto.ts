import { DonationTime } from '../../dtos/address.dto';
import { AccountType } from './mada-address.dto';

export interface MadaAddressAggregatedDto {
    name: string;
    city: string;
    street: string;
    numHouse: string;
    accountType: AccountType;
    times: DonationTime[];
}
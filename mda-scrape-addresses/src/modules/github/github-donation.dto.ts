import { AddressDto, DonationTime } from '../../dtos/address.dto';

export interface GithubDonationDto {
    address: AddressDto;
    times: DonationTime[];
}

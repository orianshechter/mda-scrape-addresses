import { AddressDto } from '../../dtos/address.dto';

export interface GithubCachedAddressDto extends AddressDto {
    lastUsedTimestamp?: string
}
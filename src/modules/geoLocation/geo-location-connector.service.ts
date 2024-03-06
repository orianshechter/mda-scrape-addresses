import { GithubConnectorService } from '../github/github-connector.service';
import { MadaAddressAggregatedDto } from "../mada/mada-address-aggregated.dto";
import { AddressDto } from '../../dtos/address.dto';
import { GoogleResponseDto } from './google-response.dto';
import { GithubCachedAddressDto } from '../github/github-cached-address.dto';

export class GeoLocationConnectorService {
    private static instance: GeoLocationConnectorService;
    private githubConnectorService: GithubConnectorService;
    private shouldUpdateCache: boolean
    private API_KEY = ''
    private cachedAddressesLocations: GithubCachedAddressDto[];

    private constructor() {
        this.githubConnectorService = GithubConnectorService.getInstance();
        this.cachedAddressesLocations = [];
        this.shouldUpdateCache = false;
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error('missing google api key')
        }
        this.API_KEY = process.env.GOOGLE_API_KEY;
    }

    public static getInstance(): GeoLocationConnectorService {
        if (!GeoLocationConnectorService.instance) {
            GeoLocationConnectorService.instance = new GeoLocationConnectorService();
        }

        return GeoLocationConnectorService.instance;
    }

    async init(): Promise<void> {
        this.cachedAddressesLocations = await this.githubConnectorService.getCachedGeoLocations()
    }

    async finish(): Promise<void> {
        if (!this.shouldUpdateCache) {
            return;
        }
        await this.githubConnectorService.updateCache(this.cachedAddressesLocations);
        this.shouldUpdateCache = false;
    }

    async getAddressByRawAddress(rawAddress: MadaAddressAggregatedDto): Promise<AddressDto> {
        const unformattedAddress = this.getUnformattedAddress(rawAddress);
        const cachedAddress = this.cachedAddressesLocations!.find(cache => cache.unformatted === unformattedAddress);
        if (cachedAddress) {
            // Add last usage, to delete unused address in the future
            cachedAddress.lastUsedTimestamp = new Date(Date.now()).toISOString();
            this.shouldUpdateCache = true;

            return {
                unformatted: cachedAddress.unformatted,
                location: cachedAddress.location,
                formatted: cachedAddress.formatted,
                city: cachedAddress.city
            };
        }

        const addressFromGoogle = await this.getAddressFromGoogle(unformattedAddress, rawAddress.city);
        this.cachedAddressesLocations.push(addressFromGoogle);
        return addressFromGoogle;
    }

    private async getAddressFromGoogle(unformattedAddress: string, city: string): Promise<AddressDto> {
        const baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
        const queryParams = {
            address: unformattedAddress,
            language: 'iw',
            key: this.API_KEY
        };

        // @ts-ignore
        const queryString = new URLSearchParams(queryParams).toString();
        const urlWithParams = `${baseUrl}?${queryString}`;

        const response = await fetch(urlWithParams);
        const googleResponse = await response.json() as GoogleResponseDto;
        if (googleResponse.status !== "OK") {
            return this.getBadAddress(unformattedAddress);
        }
        return {
            unformatted: unformattedAddress,
            location: googleResponse.results[0].geometry.location,
            formatted: googleResponse.results[0].formatted_address,
            city: city || unformattedAddress
        }
    }
    private getUnformattedAddress(rawAddress: MadaAddressAggregatedDto): string {
        if (!rawAddress.city && !rawAddress.street && !rawAddress.numHouse) {
            return rawAddress.name
        }
        let unformatted = '';
        [rawAddress.street, rawAddress.numHouse, rawAddress.city].forEach(property => {
            if (property) {
                unformatted = `${unformatted} ${property}`;
            }
        })
        if (unformatted) {
            // remove first space
            unformatted = unformatted.substring(1);
        }

        [rawAddress.name, rawAddress.accountType].forEach(property => {
            if (property) {
                unformatted = `${unformatted}, ${property}`;
            }
        })

        // remove double spaces
        unformatted = unformatted.replace(/ +(?= )/g,'');

        return unformatted;
    }

    private getBadAddress(unformattedAddress: string): AddressDto {
        return {
            unformatted: unformattedAddress,
            location: {
                lat: 33.44852903890945,
                lng: 32.05693494134149
            },
            formatted: "bad_address",
            city: ''
        }
    }
}
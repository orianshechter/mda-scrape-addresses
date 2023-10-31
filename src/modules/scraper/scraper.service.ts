import { MadaConnectorService } from '../mada/mada-connector.service';
import { GithubConnectorService } from '../github/github-connector.service';
import { GeoLocationConnectorService } from "../geoLocation/geo-location-connector.service";
import { GithubDonationDto } from '../github/github-donation.dto';

export class ScraperService {
    private madaConnector: MadaConnectorService
    private githubConnector: GithubConnectorService;
    private geoLocationConnector: GeoLocationConnectorService;
    private readonly daysAhead: number;

    constructor(daysAhead: number) {
        this.madaConnector = MadaConnectorService.getInstance();
        this.githubConnector = GithubConnectorService.getInstance();
        this.geoLocationConnector = GeoLocationConnectorService.getInstance();
        this.daysAhead = daysAhead;
    }

    async start() {
        const [madaAddresses, _] = await Promise.all([
            this.madaConnector.getAddresses(this.daysAhead),
            this.geoLocationConnector.init()
        ]);

        let githubDonationsToPush: GithubDonationDto[] = await Promise.all(
            madaAddresses.map(async (addressMada) => {
                const address = await this.geoLocationConnector.getAddressByRawAddress(addressMada);
                return {
                    address,
                    times: addressMada.times
                }
            })
        );

        await this.githubConnector.addDonations(githubDonationsToPush);
        await this.geoLocationConnector.finish();
    }
}
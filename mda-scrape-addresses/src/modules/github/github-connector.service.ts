import { AddressDto } from '../../dtos/address.dto';
import { GithubDonationDto } from './github-donation.dto';
import { GithubCachedAddressDto } from './github-cached-address.dto';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
    throw new Error('missing github token');
}

export class GithubConnectorService {
    private static instance: GithubConnectorService;
    private CACHED_GEO_LOCATIONS_URL = 'https://raw.githubusercontent.com/orianshechter/blood-donation-addresses/main/test/addressesGeoPoints.json';

    private constructor() {  }

    public static getInstance(): GithubConnectorService {
        if (!GithubConnectorService.instance) {
            GithubConnectorService.instance = new GithubConnectorService();
        }

        return GithubConnectorService.instance;
    }


    async getCachedGeoLocations(): Promise<GithubCachedAddressDto[]> {
        return await (await fetch(this.CACHED_GEO_LOCATIONS_URL)).json() as GithubCachedAddressDto[];
    }

    async addDonations(donations: GithubDonationDto[]): Promise<void> {
        return this.addFileToGithub('test/addresses.json', donations);
    }

    async updateCache(addresses: AddressDto[]): Promise<void> {
        return this.addFileToGithub('test/addressesGeoPoints.json', addresses);
    }

    private async addFileToGithub(filePath: 'test/addresses.json' | 'test/addressesGeoPoints.json',
                                  fileContent: GithubDonationDto[] | AddressDto[]): Promise<void> {
        const owner = 'orianshechter';
        const repo = 'blood-donation-addresses';
        const branch = 'main';

        // Step 1: Get the latest commit SHA for the branch
        const refResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
            method: 'GET',
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
            },
        });
        const refData = await refResponse.json() as { object: { sha: string } };
        const latestCommitSha = refData.object.sha;

        // Step 2: Create a new tree with the JSON file
        const treeData = {
            base_tree: latestCommitSha,
            tree: [
                {
                    path: filePath,
                    mode: '100644', // File mode
                    type: 'blob',
                    content: JSON.stringify(fileContent, null, 2),
                },
            ],
        };

        const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
            method: 'POST',
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(treeData),
        });
        const treeDataResponse = await treeResponse.json() as { sha: string };
        const newTreeSha = treeDataResponse.sha;

        // Step 3: Create a new commit
        const commitMessage = `${new Date(Date.now()).toLocaleString("he-IL")} update`;
        const commitData = {
            message: commitMessage,
            tree: newTreeSha,
            parents: [latestCommitSha],
        };

        const commitResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
            method: 'POST',
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(commitData),
        });
        const commitDataResponse = await commitResponse.json() as { sha: string };
        const newCommitSha = commitDataResponse.sha;

        // Step 4: Update the branch reference to point to the new commit
        const updateRefData = {
            sha: newCommitSha,
            force: false, // Use true if you want to force the update
        };

        await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateRefData),
        });

    }
    // async putAddresses
    // private async updateGeoLocationCache(cache: GithubCachedGeoLocationDto[])
}
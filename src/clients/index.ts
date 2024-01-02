import { HttpClient, HttpClientParams, IHttpClient } from './types';

/**
 * Creates a new HttpClient instance.
 * @param client
 * @param params
 */
export async function createHttpClient(
    client: HttpClient,
    params: HttpClientParams,
): Promise<IHttpClient> {
    if (typeof client === 'string') {
        // String cases
        switch (client) {
            case 'fetch': {
                const clientClass = await import('./fetchHttpClient');
                return new clientClass.default(params);
            }
            case 'axios': {
                const clientClass = await import('./axiosHttpClient');
                return new clientClass.default(params);
            }
            default:
                throw new Error(`Invalid client type: ${client}`);
        }
    } else {
        // Function case
        return client(params);
    }
}

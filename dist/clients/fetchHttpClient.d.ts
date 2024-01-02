/// <reference types="node" />
import { HttpClientParams, HttpMethod, IBackoffTimer, IHttpClient, ProxyConfig, SendRequestOptions } from './types';
type FetchRequestConfig = {
    requestInit: RequestInit;
    url: string;
    timeoutMs?: number;
    proxy?: ProxyConfig;
};
export default class FetchHttpClient implements IHttpClient {
    private readonly serverUrl;
    private readonly headers;
    private readonly minTimeout;
    private readonly maxRetries;
    private readonly proxy?;
    constructor(params: HttpClientParams);
    sendRequestWithBackoff<TContent>(method: HttpMethod, url: string, options?: SendRequestOptions, responseAsStream?: boolean, backoff?: IBackoffTimer): Promise<{
        statusCode: number;
        content: TContent;
    }>;
    prepareRequest(method: HttpMethod, url: string, options: SendRequestOptions, timeoutMs?: number): FetchRequestConfig;
    private sendFetchRequest;
    private static shouldRetry;
}
export {};

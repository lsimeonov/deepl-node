import { AxiosRequestConfig } from 'axios';
import { HttpClientParams, HttpMethod, IBackoffTimer, IHttpClient, SendRequestOptions } from './types';
/**
 * Internal class implementing HTTP requests.
 */
export default class AxiosHttpClient implements IHttpClient {
    private readonly serverUrl;
    private readonly headers;
    private readonly minTimeout;
    private readonly maxRetries;
    private readonly proxy?;
    constructor(params: HttpClientParams);
    prepareRequest(method: HttpMethod, url: string, timeoutMs: number, responseAsStream: boolean, options: SendRequestOptions): AxiosRequestConfig;
    /**
     * Makes API request retrying if necessary, and returns (as Promise) response.
     * @param method HTTP method, for example 'GET'
     * @param url Path to endpoint, excluding base server URL.
     * @param options Additional options controlling request.
     * @param responseAsStream Set to true if the return type is IncomingMessage.
     * @param backoff Backoff timer to use for retries.
     * @return Fulfills with status code and response (as text or stream).
     */
    sendRequestWithBackoff<TContent>(method: HttpMethod, url: string, options?: SendRequestOptions, responseAsStream?: boolean, backoff?: IBackoffTimer): Promise<{
        statusCode: number;
        content: TContent;
    }>;
    /**
     * Performs given HTTP request and returns status code and response content (text or stream).
     * @param axiosRequestConfig
     * @private
     */
    private static sendAxiosRequest;
    private static shouldRetry;
}

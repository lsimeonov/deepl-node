import { logDebug, logInfo } from '../utils';
import { BackoffTimer } from './backoff';
import { ConnectionError } from 'deepl-node';
import {
    HttpClientParams,
    HttpMethod,
    IBackoffTimer,
    IHttpClient,
    ProxyConfig,
    SendRequestOptions,
} from './types';
import { ProxyAgent } from 'undici';
import { Readable } from 'stream';

type FetchRequestConfig = {
    requestInit: RequestInit;
    url: string;
    timeoutMs?: number;
    proxy?: ProxyConfig;
};

export default class FetchHttpClient implements IHttpClient {
    private readonly serverUrl: string;
    private readonly headers: Record<string, string>;
    private readonly minTimeout: number;
    private readonly maxRetries: number;
    private readonly proxy?: ProxyConfig;

    constructor(params: HttpClientParams) {
        this.serverUrl = params.serverUrl;
        this.headers = params.headers;
        this.maxRetries = params.maxRetries;
        this.minTimeout = params.minTimeout;
        this.proxy = params.proxy;
    }

    async sendRequestWithBackoff<TContent>(
        method: HttpMethod,
        url: string,
        options?: SendRequestOptions,
        responseAsStream = false,
        backoff?: IBackoffTimer,
    ): Promise<{ statusCode: number; content: TContent }> {
        options = options === undefined ? {} : options;
        logInfo(`Request to DeepL API ${method} ${url}`);
        logDebug(`Request details: ${options.data}`);
        let response, error;
        backoff = backoff || new BackoffTimer();
        while (backoff.getNumRetries() <= this.maxRetries) {
            const timeoutMs = Math.max(this.minTimeout, backoff.getTimeout());
            const fetchRequestConfig = this.prepareRequest(method, url, options, timeoutMs);
            try {
                response = await this.sendFetchRequest<TContent>(
                    fetchRequestConfig,
                    responseAsStream,
                );
                error = undefined;
            } catch (e) {
                response = undefined;
                error = e as ConnectionError;
            }
            if (
                !FetchHttpClient.shouldRetry(response?.statusCode, error) ||
                backoff.getNumRetries() + 1 >= this.maxRetries
            ) {
                break;
            }
            if (error !== undefined) {
                logDebug(`Encountered a retryable-error: ${error.message}`);
            }

            logInfo(
                `Starting retry ${backoff.getNumRetries() + 1} for request ${method}` +
                    ` ${url} after sleeping for ${backoff.getTimeUntilDeadline()} seconds.`,
            );
            await backoff.sleepUntilDeadline();
        }

        if (response !== undefined) {
            const { statusCode, content } = response;
            logInfo(`DeepL API response ${method} ${url} ${statusCode}`);
            if (!responseAsStream) {
                logDebug('Response details:', { content: content });
            }
            return response;
        } else {
            throw error as Error;
        }
    }

    prepareRequest(
        method: HttpMethod,
        url: string,
        options: SendRequestOptions,
        timeoutMs?: number,
    ): FetchRequestConfig {
        const headers = Object.assign({}, this.headers, options.headers);

        const fetchRequestConfig: RequestInit = {
            method,
            headers,
        };

        if (options.fileBuffer) {
            const form = new FormData();
            form.append('file', new Blob([options.fileBuffer]), options.filename);
            if (options.data) {
                for (const [key, value] of options.data) {
                    form.append(key, value);
                }
            }
            fetchRequestConfig.body = form;
        } else if (options.data) {
            if (method === 'GET') {
                url += '?' + options.data;
            } else {
                fetchRequestConfig.body = options.data;
            }
        }

        let proxy;
        if (this.proxy) {
            const auth = this.proxy.auth?.username
                ? `${this.proxy.auth?.username}:${this.proxy.auth?.password}`
                : '';
            const proxyUrl = `${this.proxy.protocol}://${auth}${this.proxy.host}:${this.proxy.port}`;
            fetchRequestConfig.dispatcher = new ProxyAgent(proxyUrl);
        }

        return {
            requestInit: fetchRequestConfig,
            url: this.serverUrl + url,
            timeoutMs,
            proxy: proxy || undefined,
        };
    }

    private async sendFetchRequest<TContent>(
        fetchRequestConfig: FetchRequestConfig,
        responseAsStream: boolean,
    ): Promise<{ statusCode: number; content: TContent }> {
        try {
            const response = await fetch(fetchRequestConfig.url, fetchRequestConfig.requestInit);
            if (responseAsStream) {
                if (!response.body) {
                    throw new Error('Response body is undefined');
                }
                // The main library expects a IncommingMessage stream, but the fetch API returns a ReadableStream
                const stream = Readable.from(response.body);
                return { statusCode: response.status, content: stream as TContent };
            }
            const data = (await response.text()) as TContent;
            return { statusCode: response.status, content: data };
        } catch (fetchError: unknown) {
            const message: string = (fetchError as Error).message || '';

            const error = new ConnectionError(`Connection failure: ${message}`);
            error.error = fetchError as Error;
            if ((fetchError as Error).name === 'AbortError') {
                error.shouldRetry = true;
            } else {
                logDebug('Unrecognized fetch error', (fetchError as object) || undefined);
                error.shouldRetry = false;
            }
            throw error;
        }
    }

    private static shouldRetry(statusCode?: number, error?: ConnectionError): boolean {
        if (statusCode === undefined) {
            return (error as ConnectionError).shouldRetry;
        }

        // Retry on Too-Many-Requests error and internal errors
        return statusCode === 429 || statusCode >= 500;
    }
}

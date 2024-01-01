import { URLSearchParams } from 'url';

/**
 * Options for sending HTTP requests.
 */
export interface SendRequestOptions {
    /**
     * Fields to include in message body (or params). Values must be either strings, or arrays of
     * strings (for repeated parameters).
     */
    data?: URLSearchParams;
    /** Extra HTTP headers to include in request, in addition to headers defined in constructor. */
    headers?: Record<string, string>;
    /** Buffer containing file data to include. */
    fileBuffer?: Buffer;
    /** Filename of file to include. */
    filename?: string;
}

/**
 * Http method types.
 */
export type HttpMethod = 'GET' | 'DELETE' | 'POST';

export interface IBackoffTimer {
    getNumRetries(): number;

    getTimeout(): number;

    getTimeUntilDeadline(): number;

    sleepUntilDeadline(): Promise<void>;
}

/**
 * Http Client interface.
 */
export interface IHttpClient {
    sendRequestWithBackoff<TContent>(
        method: HttpMethod,
        url: string,
        options?: SendRequestOptions,
        responseAsStream?: boolean,
        backoffTimer?: IBackoffTimer,
    ): Promise<{ statusCode: number; content: TContent }>;
}

/**
 * Optional proxy configuration, may be specified as proxy in TranslatorOptions.
 * @see TranslatorOptions.proxy
 */
export interface ProxyConfig {
    host: string;
    port: number;
    auth?: {
        username: string;
        password: string;
    };
    protocol?: string;
}

/**
 * Client initialization parameters.
 */
export type HttpClientParams = {
    serverUrl: string;
    headers: Record<string, string>;
    maxRetries: number;
    minTimeout: number;
    proxy?: ProxyConfig;
};
/**
 * Possible values for the client creation
 */
export type HttpClient = 'fetch' | 'axios' | ((params: HttpClientParams) => IHttpClient);

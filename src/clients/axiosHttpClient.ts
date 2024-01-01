// Copyright 2022 DeepL SE (https://www.deepl.com)
// Use of this source code is governed by an MIT
// license that can be found in the LICENSE file.

import { ConnectionError } from '../errors';
import { logDebug, logInfo } from '../utils';

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import * as http from 'http';
import * as https from 'https';
import { BackoffTimer } from './backoff';
import {
    HttpClientParams,
    HttpMethod,
    IBackoffTimer,
    IHttpClient,
    ProxyConfig,
    SendRequestOptions,
} from './types';

const axiosInstance = axios.create({
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
});

/**
 * Internal class implementing HTTP requests.
 */
export default class AxiosHttpClient implements IHttpClient {
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

    prepareRequest(
        method: HttpMethod,
        url: string,
        timeoutMs: number,
        responseAsStream: boolean,
        options: SendRequestOptions,
    ): AxiosRequestConfig {
        const headers = Object.assign({}, this.headers, options.headers);

        const axiosRequestConfig: AxiosRequestConfig = {
            url,
            method,
            baseURL: this.serverUrl,
            headers,
            responseType: responseAsStream ? 'stream' : 'text',
            timeout: timeoutMs,
            validateStatus: null, // do not throw errors for any status codes
        };

        if (options.fileBuffer) {
            const form = new FormData();
            form.append('file', options.fileBuffer, { filename: options.filename });
            if (options.data) {
                for (const [key, value] of options.data.entries()) {
                    form.append(key, value);
                }
            }
            axiosRequestConfig.data = form;
            if (axiosRequestConfig.headers === undefined) {
                axiosRequestConfig.headers = {};
            }
            Object.assign(axiosRequestConfig.headers, form.getHeaders());
        } else if (options.data) {
            if (method === 'GET') {
                axiosRequestConfig.params = options.data;
            } else {
                axiosRequestConfig.data = options.data;
            }
        }
        axiosRequestConfig.proxy = this.proxy;
        return axiosRequestConfig;
    }

    /**
     * Makes API request retrying if necessary, and returns (as Promise) response.
     * @param method HTTP method, for example 'GET'
     * @param url Path to endpoint, excluding base server URL.
     * @param options Additional options controlling request.
     * @param responseAsStream Set to true if the return type is IncomingMessage.
     * @param backoff Backoff timer to use for retries.
     * @return Fulfills with status code and response (as text or stream).
     */
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
            const axiosRequestConfig = this.prepareRequest(
                method,
                url,
                timeoutMs,
                responseAsStream,
                options,
            );
            try {
                response = await AxiosHttpClient.sendAxiosRequest<TContent>(axiosRequestConfig);
                error = undefined;
            } catch (e) {
                response = undefined;
                error = e as ConnectionError;
            }

            if (
                !AxiosHttpClient.shouldRetry(response?.statusCode, error) ||
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

    /**
     * Performs given HTTP request and returns status code and response content (text or stream).
     * @param axiosRequestConfig
     * @private
     */
    private static async sendAxiosRequest<TContent>(
        axiosRequestConfig: AxiosRequestConfig,
    ): Promise<{ statusCode: number; content: TContent }> {
        try {
            const response = await axiosInstance.request(axiosRequestConfig);

            if (axiosRequestConfig.responseType === 'text') {
                // Workaround for axios-bug: https://github.com/axios/axios/issues/907
                if (typeof response.data === 'object') {
                    response.data = JSON.stringify(response.data);
                }
            }
            return { statusCode: response.status, content: response.data };
        } catch (axios_error_raw) {
            const axiosError = axios_error_raw as AxiosError;
            const message: string = axiosError.message || '';

            const error = new ConnectionError(`Connection failure: ${message}`);
            error.error = axiosError;
            if (axiosError.code === 'ETIMEDOUT') {
                error.shouldRetry = true;
            } else if (axiosError.code === 'ECONNABORTED') {
                error.shouldRetry = true;
            } else {
                logDebug('Unrecognized axios error', axiosError);
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

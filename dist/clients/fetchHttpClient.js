"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const backoff_1 = require("./backoff");
const deepl_node_1 = require("deepl-node");
const undici_1 = require("undici");
const stream_1 = require("stream");
class FetchHttpClient {
    constructor(params) {
        this.serverUrl = params.serverUrl;
        this.headers = params.headers;
        this.maxRetries = params.maxRetries;
        this.minTimeout = params.minTimeout;
        this.proxy = params.proxy;
    }
    async sendRequestWithBackoff(method, url, options, responseAsStream = false, backoff) {
        options = options === undefined ? {} : options;
        (0, utils_1.logInfo)(`Request to DeepL API ${method} ${url}`);
        (0, utils_1.logDebug)(`Request details: ${options.data}`);
        let response, error;
        backoff = backoff || new backoff_1.BackoffTimer();
        while (backoff.getNumRetries() <= this.maxRetries) {
            const timeoutMs = Math.max(this.minTimeout, backoff.getTimeout());
            const fetchRequestConfig = this.prepareRequest(method, url, options, timeoutMs);
            try {
                response = await this.sendFetchRequest(fetchRequestConfig, responseAsStream);
                error = undefined;
            }
            catch (e) {
                response = undefined;
                error = e;
            }
            if (!FetchHttpClient.shouldRetry(response === null || response === void 0 ? void 0 : response.statusCode, error) ||
                backoff.getNumRetries() + 1 >= this.maxRetries) {
                break;
            }
            if (error !== undefined) {
                (0, utils_1.logDebug)(`Encountered a retryable-error: ${error.message}`);
            }
            (0, utils_1.logInfo)(`Starting retry ${backoff.getNumRetries() + 1} for request ${method}` +
                ` ${url} after sleeping for ${backoff.getTimeUntilDeadline()} seconds.`);
            await backoff.sleepUntilDeadline();
        }
        if (response !== undefined) {
            const { statusCode, content } = response;
            (0, utils_1.logInfo)(`DeepL API response ${method} ${url} ${statusCode}`);
            if (!responseAsStream) {
                (0, utils_1.logDebug)('Response details:', { content: content });
            }
            return response;
        }
        else {
            throw error;
        }
    }
    prepareRequest(method, url, options, timeoutMs) {
        var _a, _b, _c;
        const headers = Object.assign({}, this.headers, options.headers);
        const fetchRequestConfig = {
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
        }
        else if (options.data) {
            if (method === 'GET') {
                url += '?' + options.data;
            }
            else {
                fetchRequestConfig.body = options.data;
            }
        }
        let proxy;
        if (this.proxy) {
            const auth = ((_a = this.proxy.auth) === null || _a === void 0 ? void 0 : _a.username)
                ? `${(_b = this.proxy.auth) === null || _b === void 0 ? void 0 : _b.username}:${(_c = this.proxy.auth) === null || _c === void 0 ? void 0 : _c.password}`
                : '';
            const proxyUrl = `${this.proxy.protocol}://${auth}${this.proxy.host}:${this.proxy.port}`;
            fetchRequestConfig.dispatcher = new undici_1.ProxyAgent(proxyUrl);
        }
        return {
            requestInit: fetchRequestConfig,
            url: this.serverUrl + url,
            timeoutMs,
            proxy: proxy || undefined,
        };
    }
    async sendFetchRequest(fetchRequestConfig, responseAsStream) {
        try {
            const response = await fetch(fetchRequestConfig.url, fetchRequestConfig.requestInit);
            if (responseAsStream) {
                if (!response.body) {
                    throw new Error('Response body is undefined');
                }
                // The main library expects a IncommingMessage stream, but the fetch API returns a ReadableStream
                const stream = stream_1.Readable.from(response.body);
                return { statusCode: response.status, content: stream };
            }
            let data = (await response.text());
            return { statusCode: response.status, content: data };
        }
        catch (fetchError) {
            const message = fetchError.message || '';
            const error = new deepl_node_1.ConnectionError(`Connection failure: ${message}`);
            error.error = fetchError;
            if (fetchError.name === 'AbortError') {
                error.shouldRetry = true;
            }
            else {
                (0, utils_1.logDebug)('Unrecognized fetch error', fetchError);
                error.shouldRetry = false;
            }
            throw error;
        }
    }
    static shouldRetry(statusCode, error) {
        if (statusCode === undefined) {
            return error.shouldRetry;
        }
        // Retry on Too-Many-Requests error and internal errors
        return statusCode === 429 || statusCode >= 500;
    }
}
exports.default = FetchHttpClient;

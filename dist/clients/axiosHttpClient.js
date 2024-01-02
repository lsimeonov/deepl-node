"use strict";
// Copyright 2022 DeepL SE (https://www.deepl.com)
// Use of this source code is governed by an MIT
// license that can be found in the LICENSE file.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("../errors");
const utils_1 = require("../utils");
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const backoff_1 = require("./backoff");
const axiosInstance = axios_1.default.create({
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
});
/**
 * Internal class implementing HTTP requests.
 */
class AxiosHttpClient {
    constructor(params) {
        this.serverUrl = params.serverUrl;
        this.headers = params.headers;
        this.maxRetries = params.maxRetries;
        this.minTimeout = params.minTimeout;
        this.proxy = params.proxy;
    }
    prepareRequest(method, url, timeoutMs, responseAsStream, options) {
        const headers = Object.assign({}, this.headers, options.headers);
        const axiosRequestConfig = {
            url,
            method,
            baseURL: this.serverUrl,
            headers,
            responseType: responseAsStream ? 'stream' : 'text',
            timeout: timeoutMs,
            validateStatus: null, // do not throw errors for any status codes
        };
        if (options.fileBuffer) {
            const form = new form_data_1.default();
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
        }
        else if (options.data) {
            if (method === 'GET') {
                axiosRequestConfig.params = options.data;
            }
            else {
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
    async sendRequestWithBackoff(method, url, options, responseAsStream = false, backoff) {
        options = options === undefined ? {} : options;
        (0, utils_1.logInfo)(`Request to DeepL API ${method} ${url}`);
        (0, utils_1.logDebug)(`Request details: ${options.data}`);
        let response, error;
        backoff = backoff || new backoff_1.BackoffTimer();
        while (backoff.getNumRetries() <= this.maxRetries) {
            const timeoutMs = Math.max(this.minTimeout, backoff.getTimeout());
            const axiosRequestConfig = this.prepareRequest(method, url, timeoutMs, responseAsStream, options);
            try {
                response = await AxiosHttpClient.sendAxiosRequest(axiosRequestConfig);
                error = undefined;
            }
            catch (e) {
                response = undefined;
                error = e;
            }
            if (!AxiosHttpClient.shouldRetry(response === null || response === void 0 ? void 0 : response.statusCode, error) ||
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
    /**
     * Performs given HTTP request and returns status code and response content (text or stream).
     * @param axiosRequestConfig
     * @private
     */
    static async sendAxiosRequest(axiosRequestConfig) {
        try {
            const response = await axiosInstance.request(axiosRequestConfig);
            if (axiosRequestConfig.responseType === 'text') {
                // Workaround for axios-bug: https://github.com/axios/axios/issues/907
                if (typeof response.data === 'object') {
                    response.data = JSON.stringify(response.data);
                }
            }
            return { statusCode: response.status, content: response.data };
        }
        catch (axios_error_raw) {
            const axiosError = axios_error_raw;
            const message = axiosError.message || '';
            const error = new errors_1.ConnectionError(`Connection failure: ${message}`);
            error.error = axiosError;
            if (axiosError.code === 'ETIMEDOUT') {
                error.shouldRetry = true;
            }
            else if (axiosError.code === 'ECONNABORTED') {
                error.shouldRetry = true;
            }
            else {
                (0, utils_1.logDebug)('Unrecognized axios error', axiosError);
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
exports.default = AxiosHttpClient;

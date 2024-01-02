import { DocumentHandle } from './types';
export declare class DeepLError extends Error {
    error?: Error;
    constructor(message: string, error?: Error);
}
export declare class AuthorizationError extends DeepLError {
}
export declare class QuotaExceededError extends DeepLError {
}
export declare class TooManyRequestsError extends DeepLError {
}
export declare class ConnectionError extends DeepLError {
    shouldRetry: boolean;
    constructor(message: string, shouldRetry?: boolean, error?: Error);
}
export declare class DocumentTranslationError extends DeepLError {
    readonly documentHandle?: DocumentHandle;
    constructor(message: string, handle?: DocumentHandle, error?: Error);
}
export declare class GlossaryNotFoundError extends DeepLError {
}
export declare class DocumentNotReadyError extends DeepLError {
}

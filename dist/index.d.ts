/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { GlossaryEntries } from './glossaryEntries';
import { DocumentHandle, DocumentTranslateOptions, GlossaryId, GlossaryInfo, LanguageCode, NonRegionalLanguageCode, SourceGlossaryLanguageCode, SourceLanguageCode, TargetGlossaryLanguageCode, TargetLanguageCode, TranslateTextOptions, TranslatorOptions } from './types';
import * as fs from 'fs';
export * from './errors';
export * from './glossaryEntries';
export * from './types';
/**
 * Stores the count and limit for one usage type.
 */
export interface UsageDetail {
    /** The amount used of this usage type. */
    readonly count: number;
    /** The maximum allowable amount for this usage type. */
    readonly limit: number;
    /**
     * Returns true if the amount used has already reached or passed the allowable amount.
     */
    limitReached(): boolean;
}
/**
 * Information about the API usage: how much has been translated in this billing period, and the
 * maximum allowable amount.
 *
 * Depending on the account type, different usage types are included: the character, document and
 * teamDocument fields provide details about each corresponding usage type, allowing each usage type
 * to be checked individually. The anyLimitReached() function checks if any usage type is exceeded.
 */
export interface Usage {
    /** Usage details for characters, for example due to the translateText() function. */
    readonly character?: UsageDetail;
    /** Usage details for documents. */
    readonly document?: UsageDetail;
    /** Usage details for documents shared among your team. */
    readonly teamDocument?: UsageDetail;
    /** Returns true if any usage type limit has been reached or passed, otherwise false. */
    anyLimitReached(): boolean;
    /** Converts the usage details to a human-readable string. */
    toString(): string;
}
/**
 * Information about a language supported by DeepL translator.
 */
export interface Language {
    /** Name of the language in English. */
    readonly name: string;
    /**
     * Language code according to ISO 639-1, for example 'en'. Some target languages also include
     * the regional variant according to ISO 3166-1, for example 'en-US'.
     */
    readonly code: LanguageCode;
    /**
     * Only defined for target languages. If defined, specifies whether the formality option is
     * available for this target language.
     */
    readonly supportsFormality?: boolean;
}
/**
 * Information about a pair of languages supported for DeepL glossaries.
 */
export interface GlossaryLanguagePair {
    /**
     * The code of the source language.
     */
    readonly sourceLang: SourceGlossaryLanguageCode;
    /**
     * The code of the target language.
     */
    readonly targetLang: TargetGlossaryLanguageCode;
}
export type DocumentStatusCode = 'queued' | 'translating' | 'error' | 'done';
/**
 * Status of a document translation request.
 */
export interface DocumentStatus {
    /**
     * One of the status values defined in DocumentStatusCode.
     * @see DocumentStatusCode
     */
    readonly status: DocumentStatusCode;
    /**
     * Estimated time until document translation completes in seconds, otherwise undefined if
     * unknown.
     */
    readonly secondsRemaining?: number;
    /**
     * Number of characters billed for this document, or undefined if unknown or before translation
     * is complete.
     */
    readonly billedCharacters?: number;
    /**
     * A short description of the error, or undefined if no error has occurred.
     */
    readonly errorMessage?: string;
    /**
     * True if no error has occurred, otherwise false. Note that while the document translation is
     * in progress, this returns true.
     */
    ok(): boolean;
    /**
     * True if the document translation completed successfully, otherwise false.
     */
    done(): boolean;
}
/**
 * Changes the upper- and lower-casing of the given language code to match ISO 639-1 with an
 * optional regional code from ISO 3166-1.
 * For example, input 'EN-US' returns 'en-US'.
 * @param langCode String containing language code to standardize.
 * @return Standardized language code.
 */
export declare function standardizeLanguageCode(langCode: string): LanguageCode;
/**
 * Removes the regional variant from a language, for example inputs 'en' and 'en-US' both return
 * 'en'.
 * @param langCode String containing language code to convert.
 * @return Language code with regional variant removed.
 */
export declare function nonRegionalLanguageCode(langCode: string): NonRegionalLanguageCode;
/**
 * Holds the result of a text translation request.
 */
export interface TextResult {
    /**
     * String containing the translated text.
     */
    readonly text: string;
    /**
     * Language code of the detected source language.
     */
    readonly detectedSourceLang: SourceLanguageCode;
}
/**
 * Returns true if the specified DeepL Authentication Key is associated with a free account,
 * otherwise false.
 * @param authKey The authentication key to check.
 * @return True if the key is associated with a free account, otherwise false.
 */
export declare function isFreeAccountAuthKey(authKey: string): boolean;
/**
 * Wrapper for the DeepL API for language translation.
 * Create an instance of Translator to use the DeepL API.
 */
export declare class Translator {
    /**
     * Construct a Translator object wrapping the DeepL API using your authentication key.
     * This does not connect to the API, and returns immediately.
     * @param authKey Authentication key as specified in your account.
     * @param options Additional options controlling Translator behavior.
     */
    constructor(authKey: string, options?: TranslatorOptions);
    /**
     * Queries character and document usage during the current billing period.
     * @return Fulfills with Usage object on success.
     */
    getUsage(): Promise<Usage>;
    /**
     * Queries source languages supported by DeepL API.
     * @return Fulfills with array of Language objects containing available source languages.
     */
    getSourceLanguages(): Promise<readonly Language[]>;
    /**
     * Queries target languages supported by DeepL API.
     * @return Fulfills with array of Language objects containing available target languages.
     */
    getTargetLanguages(): Promise<readonly Language[]>;
    /**
     * Queries language pairs supported for glossaries by DeepL API.
     * @return Fulfills with an array of GlossaryLanguagePair objects containing languages supported for glossaries.
     */
    getGlossaryLanguagePairs(): Promise<readonly GlossaryLanguagePair[]>;
    /**
     * Translates specified text string or array of text strings into the target language.
     * @param texts Text string or array of strings containing input text(s) to translate.
     * @param sourceLang Language code of input text language, or null to use auto-detection.
     * @param targetLang Language code of language to translate into.
     * @param options Optional TranslateTextOptions object containing additional options controlling translation.
     * @return Fulfills with a TextResult object or an array of TextResult objects corresponding to input texts; use the `TextResult.text` property to access the translated text.
     */
    translateText<T extends string | string[]>(texts: T, sourceLang: SourceLanguageCode | null, targetLang: TargetLanguageCode, options?: TranslateTextOptions): Promise<T extends string ? TextResult : TextResult[]>;
    /**
     * Uploads specified document to DeepL to translate into given target language, waits for
     * translation to complete, then downloads translated document to specified output path.
     * @param inputFile String containing file path of document to be translated, or a Stream,
     *     Buffer, or FileHandle containing file data. Note: unless file path is used, then
     *     `options.filename` must be specified.
     * @param outputFile String containing file path to create translated document, or Stream or
     *     FileHandle to write translated document content.
     * @param sourceLang Language code of input document, or null to use auto-detection.
     * @param targetLang Language code of language to translate into.
     * @param options Optional DocumentTranslateOptions object containing additional options controlling translation.
     * @return Fulfills with a DocumentStatus object for the completed translation. You can use the
     *     billedCharacters property to check how many characters were billed for the document.
     * @throws {Error} If no file exists at the input file path, or a file already exists at the output file path.
     * @throws {DocumentTranslationError} If any error occurs during document upload, translation or
     *     download. The `documentHandle` property of the error may be used to recover the document.
     */
    translateDocument(inputFile: string | Buffer | fs.ReadStream | fs.promises.FileHandle, outputFile: string | fs.WriteStream | fs.promises.FileHandle, sourceLang: SourceLanguageCode | null, targetLang: TargetLanguageCode, options?: DocumentTranslateOptions): Promise<DocumentStatus>;
    /**
     * Uploads specified document to DeepL to translate into target language, and returns handle associated with the document.
     * @param inputFile String containing file path, stream containing file data, or FileHandle.
     *     Note: if a Buffer, Stream, or FileHandle is used, then `options.filename` must be specified.
     * @param sourceLang Language code of input document, or null to use auto-detection.
     * @param targetLang Language code of language to translate into.
     * @param options Optional DocumentTranslateOptions object containing additional options controlling translation.
     * @return Fulfills with DocumentHandle associated with the in-progress translation.
     */
    uploadDocument(inputFile: string | Buffer | fs.ReadStream | fs.promises.FileHandle, sourceLang: SourceLanguageCode | null, targetLang: TargetLanguageCode, options?: DocumentTranslateOptions): Promise<DocumentHandle>;
    /**
     * Retrieves the status of the document translation associated with the given document handle.
     * @param handle Document handle associated with document.
     * @return Fulfills with a DocumentStatus giving the document translation status.
     */
    getDocumentStatus(handle: DocumentHandle): Promise<DocumentStatus>;
    /**
     * Downloads the translated document associated with the given document handle to the specified output file path or stream.handle.
     * @param handle Document handle associated with document.
     * @param outputFile String containing output file path, or Stream or FileHandle to store file data.
     * @return Fulfills with undefined, or rejects if the document translation has not been completed.
     */
    downloadDocument(handle: DocumentHandle, outputFile: string | fs.WriteStream | fs.promises.FileHandle): Promise<void>;
    /**
     * Returns a promise that resolves when the given document translation completes, or rejects if
     * there was an error communicating with the DeepL API or the document translation failed.
     * @param handle {DocumentHandle} Handle to the document translation.
     * @return Fulfills with input DocumentHandle and DocumentStatus when the document translation
     * completes successfully, rejects if translation fails or a communication error occurs.
     */
    isDocumentTranslationComplete(handle: DocumentHandle): Promise<{
        handle: DocumentHandle;
        status: DocumentStatus;
    }>;
    /**
     * Creates a new glossary on the DeepL server with given name, languages, and entries.
     * @param name User-defined name to assign to the glossary.
     * @param sourceLang Language code of the glossary source terms.
     * @param targetLang Language code of the glossary target terms.
     * @param entries The source- & target-term pairs to add to the glossary.
     * @return Fulfills with a GlossaryInfo containing details about the created glossary.
     */
    createGlossary(name: string, sourceLang: LanguageCode, targetLang: LanguageCode, entries: GlossaryEntries): Promise<GlossaryInfo>;
    /**
     * Creates a new glossary on DeepL server with given name, languages, and CSV data.
     * @param name User-defined name to assign to the glossary.
     * @param sourceLang Language code of the glossary source terms.
     * @param targetLang Language code of the glossary target terms.
     * @param csvFile String containing the path of the CSV file to be translated, or a Stream,
     *     Buffer, or a FileHandle containing CSV file content.
     * @return Fulfills with a GlossaryInfo containing details about the created glossary.
     */
    createGlossaryWithCsv(name: string, sourceLang: LanguageCode, targetLang: LanguageCode, csvFile: string | Buffer | fs.ReadStream | fs.promises.FileHandle): Promise<GlossaryInfo>;
    /**
     * Gets information about an existing glossary.
     * @param glossaryId Glossary ID of the glossary.
     * @return Fulfills with a GlossaryInfo containing details about the glossary.
     */
    getGlossary(glossaryId: GlossaryId): Promise<GlossaryInfo>;
    /**
     * Gets information about all existing glossaries.
     * @return Fulfills with an array of GlossaryInfos containing details about all existing glossaries.
     */
    listGlossaries(): Promise<GlossaryInfo[]>;
    /**
     * Retrieves the entries stored with the glossary with the given glossary ID or GlossaryInfo.
     * @param glossary Glossary ID or GlossaryInfo of glossary to retrieve entries of.
     * @return Fulfills with GlossaryEntries holding the glossary entries.
     */
    getGlossaryEntries(glossary: GlossaryId | GlossaryInfo): Promise<GlossaryEntries>;
    /**
     * Deletes the glossary with the given glossary ID or GlossaryInfo.
     * @param glossary Glossary ID or GlossaryInfo of glossary to be deleted.
     * @return Fulfills with undefined when the glossary is deleted.
     */
    deleteGlossary(glossary: GlossaryId | GlossaryInfo): Promise<void>;
    /**
     * Upload given stream for document translation and returns document handle.
     * @private
     */
    private internalUploadDocument;
    /**
     * Download translated document associated with specified handle to given stream.
     * @private
     */
    private internalDownloadDocument;
    /**
     * Create glossary with given details.
     * @private
     */
    private internalCreateGlossary;
    private constructUserAgentString;
    /**
     * HttpClient implements all HTTP requests and retries.
     * @private
     */
    private readonly httpClient;
}
export { IHttpClient } from './clients/types';
export { SendRequestOptions } from './clients/types';
export { HttpMethod } from './clients/types';
export { HttpClient } from './clients/types';
export { HttpClientParams } from './clients/types';
export { ProxyConfig } from './clients/types';

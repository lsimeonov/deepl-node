import { DocumentStatus, GlossaryLanguagePair, Language, TextResult, Usage, DocumentHandle } from './index';
import { GlossaryInfo } from './types';
/**
 * Parses the given JSON string to a GlossaryInfo object.
 * @private
 */
export declare function parseGlossaryInfo(json: string): GlossaryInfo;
/**
 * Parses the given JSON string to an array of GlossaryInfo objects.
 * @private
 */
export declare function parseGlossaryInfoList(json: string): GlossaryInfo[];
/**
 * Parses the given JSON string to a DocumentStatus object.
 * @private
 */
export declare function parseDocumentStatus(json: string): DocumentStatus;
/**
 * Parses the given JSON string to a Usage object.
 * @private
 */
export declare function parseUsage(json: string): Usage;
/**
 * Parses the given JSON string to an array of TextResult objects.
 * @private
 */
export declare function parseTextResultArray(json: string): TextResult[];
/**
 * Parses the given JSON string to an array of Language objects.
 * @private
 */
export declare function parseLanguageArray(json: string): Language[];
/**
 * Parses the given JSON string to an array of GlossaryLanguagePair objects.
 * @private
 */
export declare function parseGlossaryLanguagePairArray(json: string): GlossaryLanguagePair[];
/**
 * Parses the given JSON string to a DocumentHandle object.
 * @private
 */
export declare function parseDocumentHandle(json: string): DocumentHandle;

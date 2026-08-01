import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsIn, MaxLength, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Supported image MIME types for analysis
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

/**
 * Supported document MIME types for analysis
 */
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
] as const;

/**
 * Image input for multimodal analysis
 */
export class ImageInput {
  @IsNotEmpty()
  @IsString()
  @IsIn(SUPPORTED_IMAGE_TYPES)
  mimeType: typeof SUPPORTED_IMAGE_TYPES[number];

  @IsNotEmpty()
  @IsString()
  @MaxLength(6_700_000, { message: 'Image exceeds maximum size of 5MB' })
  data: string; // Base64 encoded image data — 6.7MB base64 ≈ 5MB binary
}

/**
 * Document input for multimodal analysis
 */
export class DocumentInput {
  @IsNotEmpty()
  @IsString()
  @IsNotEmpty()
  @IsString()
  @IsIn([...SUPPORTED_DOCUMENT_TYPES])
  mimeType: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(13_400_000, { message: 'Document exceeds maximum size of 10MB' })
  data: string; // Base64 encoded document data — 13.4MB base64 ≈ 10MB binary

  @IsOptional()
  @IsString()
  filename?: string; // Original filename for logging
}

/**
 * Main DTO for AI analysis requests
 * Supports text-only, text+images, text+documents, or any combination
 */
export class AnalyzeTextDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  userId?: string; // Optional context

  @IsOptional()
  @IsString()
  context?: string; // Additional context if needed

  @IsOptional()
  metadata?: {
    sourcedomain?: string;
  };

  /**
   * Array of images to analyze (screenshots, photos, etc.)
   * Max 1 image per request in MVP (can be extended later)
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: 'Maximum 3 images per request' })
  @ValidateNested({ each: true })
  @Type(() => ImageInput)
  images?: ImageInput[];

  /**
   * Array of documents to analyze (PDFs, Word, Excel)
   * Max 1 document per request in MVP (can be extended later)
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2, { message: 'Maximum 2 documents per request' })
  @ValidateNested({ each: true })
  @Type(() => DocumentInput)
  documents?: DocumentInput[];
}


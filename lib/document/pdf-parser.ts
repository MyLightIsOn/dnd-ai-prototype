import { PDFParse } from 'pdf-parse';

/**
 * Extract text content from a PDF file
 * @param file The PDF file to extract text from
 * @returns The extracted text content
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

/**
 * Determine the file type based on the file name extension
 * @param fileName The file name with extension
 * @returns The file type category
 */
export function determineFileType(fileName: string): 'pdf' | 'txt' | 'md' | 'code' {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'txt') return 'txt';
  if (ext === 'md') return 'md';
  return 'code'; // js, ts, py, etc.
}

import { logger } from '../lib/logger';

const TEXT_EXTENSIONS = ['.txt', '.md', '.csv'];

function extOf(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

/**
 * Extracts plain text from an uploaded knowledge-base file. Supports plain
 * text formats directly, plus real PDF/DOCX parsing (pdf-parse / mammoth) —
 * replaces the old client-side FileReader.readAsText, which produced
 * unreadable binary noise for PDF/DOCX uploads.
 */
export async function extractTextFromFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = extOf(filename);

  if (TEXT_EXTENSIONS.includes(ext)) {
    return buffer.toString('utf-8');
  }

  if (ext === '.pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (ext === '.docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  logger.warn({ filename, ext }, '[KB UPLOAD] Unsupported file type');
  throw new Error(
    `Unsupported file type: ${ext || '(no extension)'}. Supported: .txt, .md, .csv, .pdf, .docx`
  );
}

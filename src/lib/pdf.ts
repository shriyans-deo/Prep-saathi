import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_CHARS = 3000;
const MAX_PAGES = 10;

// Extracts selectable text in the browser. Returns an empty string for scanned PDFs,
// which the caller must report honestly; there is no substitute text.
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = '';
  for (let n = 1; n <= Math.min(pdf.numPages, MAX_PAGES) && text.length < MAX_CHARS; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n';
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
}

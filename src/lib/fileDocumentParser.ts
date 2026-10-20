import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { parsePastedPlayerList, ParsedCandidatePlayer } from './playerListParser';

export interface DocumentParseResult {
  success: boolean;
  fileName: string;
  fileType: 'EXCEL' | 'WORD' | 'CSV' | 'TEXT' | 'UNKNOWN';
  rawText: string;
  players: ParsedCandidatePlayer[];
  sheetName?: string;
  error?: string;
}

/**
 * Extracts structured tab-delimited or line-based text from Word document HTML output.
 * Preserves table structures (converts <tr> to tab-delimited lines) as well
 * as bulleted lists, numbered lists, and paragraphs.
 */
export function extractLinesFromWordHtml(html: string): string {
  if (!html || !html.trim()) return '';

  // 1. If HTML contains tables, convert rows into tab-delimited lines
  const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tableRows: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tableRowRegex.exec(html)) !== null) {
    const rowContent = match[1];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const text = cellMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      cells.push(text);
    }
    if (cells.length > 0) {
      tableRows.push(cells.join('\t'));
    }
  }

  if (tableRows.length > 0) {
    return tableRows.join('\n');
  }

  // 2. Otherwise extract paragraphs and list items
  const blockRegex = /<(?:p|li)[^>]*>([\s\S]*?)<\/(?:p|li)>/gi;
  const blockLines: string[] = [];
  while ((match = blockRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) {
      blockLines.push(text);
    }
  }

  if (blockLines.length > 0) {
    return blockLines.join('\n');
  }

  // 3. Fallback: strip tags
  return html.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n').trim();
}

/**
 * Reads any browsed file from user's device (.xlsx, .xls, .docx, .csv, .txt, .tsv, .trf)
 * and extracts all candidate players into structured records for the tournament.
 */
export async function parseDocumentFile(file: File): Promise<DocumentParseResult> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  try {
    // 1. Legacy Word format (.doc) detection with friendly guidance
    if (ext === 'doc') {
      return {
        success: false,
        fileName,
        fileType: 'WORD',
        rawText: '',
        players: [],
        error: 'Legacy Word 97-2003 (.doc) format detected. Please save or export your file as modern Word (.docx) or Excel (.xlsx) and upload again.',
      };
    }

    // 2. Excel Spreadsheet (.xlsx, .xls)
    if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return {
          success: false,
          fileName,
          fileType: 'EXCEL',
          rawText: '',
          players: [],
          error: 'The uploaded Excel workbook contains no sheets.',
        };
      }

      // Scan all worksheets in the workbook to locate the one with the candidate players
      let bestPlayers: ParsedCandidatePlayer[] = [];
      let bestText = '';
      let bestSheetName = workbook.SheetNames[0];

      // Prioritize sheet names like "players", "roster", "candidates", etc.
      const prioritizedSheetNames = [...workbook.SheetNames].sort((a, b) => {
        const score = (name: string) =>
          /player|roster|candidate|participant|entrant|entry|seed|round|open/i.test(name) ? 1 : 0;
        return score(b) - score(a);
      });

      for (const sheetName of prioritizedSheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const tsvText = XLSX.utils.sheet_to_csv(sheet, { FS: '\t' });
        const candidateList = parsePastedPlayerList(tsvText);

        if (candidateList.length > bestPlayers.length) {
          bestPlayers = candidateList;
          bestText = tsvText;
          bestSheetName = sheetName;
        }
      }

      return {
        success: bestPlayers.length > 0,
        fileName,
        fileType: 'EXCEL',
        rawText: bestText,
        players: bestPlayers,
        sheetName: bestSheetName,
        error:
          bestPlayers.length === 0
            ? 'No valid player rows detected in Excel spreadsheet. Make sure columns contain Player Name and Rating/Title.'
            : undefined,
      };
    }

    // 3. Microsoft Word Document (.docx)
    if (ext === 'docx') {
      const buffer = await file.arrayBuffer();

      // First attempt: HTML conversion to preserve Word tables, bulleted lists, and numbered lists
      try {
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
        const htmlText = extractLinesFromWordHtml(htmlResult.value || '');
        const htmlPlayers = parsePastedPlayerList(htmlText);

        if (htmlPlayers.length > 0) {
          return {
            success: true,
            fileName,
            fileType: 'WORD',
            rawText: htmlText,
            players: htmlPlayers,
          };
        }
      } catch (htmlErr) {
        console.warn('Word HTML conversion failed, trying raw text fallback', htmlErr);
      }

      // Second attempt: raw text extraction
      const rawResult = await mammoth.extractRawText({ arrayBuffer: buffer });
      const docxText = rawResult.value || '';
      const rawPlayers = parsePastedPlayerList(docxText);

      return {
        success: rawPlayers.length > 0,
        fileName,
        fileType: 'WORD',
        rawText: docxText,
        players: rawPlayers,
        error:
          rawPlayers.length === 0
            ? 'No candidate player list found in Word document. Ensure players are formatted in a table or list (e.g. "1. Player Name - Rating - Title").'
            : undefined,
      };
    }

    // 4. Plain Text, CSV, TSV, or TRF
    if (ext === 'csv' || ext === 'txt' || ext === 'tsv' || ext === 'trf') {
      const text = await file.text();
      const players = parsePastedPlayerList(text);

      return {
        success: players.length > 0,
        fileName,
        fileType: ext === 'csv' ? 'CSV' : 'TEXT',
        rawText: text,
        players,
        error: players.length === 0 ? 'No valid players found in file.' : undefined,
      };
    }

    // 5. Fallback: try reading as plain text
    try {
      const text = await file.text();
      const players = parsePastedPlayerList(text);
      if (players.length > 0) {
        return {
          success: true,
          fileName,
          fileType: 'TEXT',
          rawText: text,
          players,
        };
      }
    } catch {
      // Ignore fallback error
    }

    return {
      success: false,
      fileName,
      fileType: 'UNKNOWN',
      rawText: '',
      players: [],
      error: `Unsupported file format (.${ext}). Please upload an Excel (.xlsx, .xls), Word (.docx), or CSV/TXT file.`,
    };
  } catch (err: any) {
    console.error('Document parsing error:', err);
    return {
      success: false,
      fileName,
      fileType: 'UNKNOWN',
      rawText: '',
      players: [],
      error: `Failed to process document: ${err?.message || 'Corrupt or unreadable file'}`,
    };
  }
}

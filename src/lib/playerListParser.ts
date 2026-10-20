import { FideTitle } from './fideSwissEngine';

export interface ParsedCandidatePlayer {
  id?: string;
  name: string;
  rating: number;
  title: FideTitle;
  fideId?: string;
  organization: string;
  gender: 'M' | 'F' | 'OTHER';
  birthYear: number;
  rawLine?: string;
  confidence?: 'HIGH' | 'MEDIUM';
}

export const FIDE_TITLE_SET = new Set(['GM', 'WGM', 'IM', 'WIM', 'FM', 'WFM', 'CM', 'WCM']);

export const KNOWN_FEDERATIONS = new Set([
  'USA', 'IND', 'SUI', 'RUS', 'GER', 'FRA', 'ENG', 'ESP', 'CHN', 'NOR',
  'POL', 'UKR', 'AZE', 'NED', 'HUN', 'ARM', 'GEO', 'ROU', 'CZE', 'TUR',
  'SWE', 'GRE', 'SRB', 'CRO', 'AUT', 'BEL', 'DEN', 'FIN', 'ITA', 'POR',
  'CAN', 'AUS', 'BRA', 'ARG', 'MEX', 'EGY', 'RSA', 'IRI', 'KAZ', 'UZB',
  'FID', 'FIDE', 'VIE', 'PHI', 'INA', 'SGP', 'ISR', 'JPN', 'CUB', 'COL',
  'PER', 'CHI', 'NZL', 'IRL', 'SCO', 'WLS', 'ISL', 'SVK', 'SLO', 'BUL',
  'LTU', 'LAT', 'EST', 'BLR', 'MDA', 'MGL', 'BAN', 'SRI', 'NEP', 'PAK',
  'MAS', 'THA', 'UAE', 'QAT', 'KSA', 'EGY', 'RSA', 'NGR'
]);

export const KNOWN_COUNTRY_NAMES = new Set([
  'india', 'norway', 'china', 'united states', 'usa', 'united states of america',
  'switzerland', 'england', 'united kingdom', 'uk', 'great britain', 'russia',
  'germany', 'france', 'spain', 'poland', 'ukraine', 'azerbaijan', 'netherlands',
  'holland', 'hungary', 'armenia', 'georgia', 'romania', 'czech republic', 'czechia',
  'turkey', 'türkiye', 'sweden', 'greece', 'serbia', 'croatia', 'austria', 'belgium',
  'denmark', 'finland', 'italy', 'portugal', 'canada', 'australia', 'brazil',
  'argentina', 'mexico', 'egypt', 'south africa', 'iran', 'kazakhstan', 'uzbekistan',
  'vietnam', 'philippines', 'indonesia', 'singapore', 'israel', 'japan', 'cuba',
  'colombia', 'peru', 'chile', 'new zealand', 'ireland', 'scotland', 'wales',
  'iceland', 'slovakia', 'slovenia', 'bulgaria', 'lithuania', 'latvia', 'estonia',
  'belarus', 'moldova', 'mongolia', 'bangladesh', 'sri lanka', 'nepal', 'pakistan',
  'malaysia', 'thailand', 'united arab emirates', 'uae', 'qatar', 'saudi arabia',
  'morocco', 'algeria', 'tunisia', 'nigeria', 'kenya', 'uganda', 'zimbabwe',
  'fide'
]);

export interface ColumnMapping {
  colName?: number;
  colFirstName?: number;
  colLastName?: number;
  colRating?: number;
  colTitle?: number;
  colFideId?: number;
  colOrg?: number;
  colGender?: number;
  colBirthYear?: number;
  delimiter?: string;
}

export function detectHeaderMapping(tokens: string[]): ColumnMapping | null {
  const mapping: ColumnMapping = {};

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i].trim().toLowerCase();
    if (!raw) continue;

    if (/^(player\s*name|full\s*name|name|nom|spieler|athlete|participant|joueur)$/i.test(raw)) {
      mapping.colName = i;
    } else if (/^(first\s*name|given\s*name|forename|prénom)$/i.test(raw)) {
      mapping.colFirstName = i;
    } else if (/^(last\s*name|surname|family\s*name|nom\s*de\s*famille)$/i.test(raw)) {
      mapping.colLastName = i;
    } else if (/^(rating|elo|fide\s*rating|national\s*rating|rtng|points|score)$/i.test(raw)) {
      mapping.colRating = i;
    } else if (/^(title|fide\s*title|titel|titre)$/i.test(raw)) {
      mapping.colTitle = i;
    } else if (/^(fide\s*id|fideid|fide_id|id|fide|card\s*number|license|licence)$/i.test(raw)) {
      mapping.colFideId = i;
    } else if (/^(federation|fed|country|club|organization|org|team|academy|state|city|school)$/i.test(raw)) {
      mapping.colOrg = i;
    } else if (/^(gender|sex|sexe|m\/f)$/i.test(raw)) {
      mapping.colGender = i;
    } else if (/^(birth\s*year|year|dob|birth|yob|age|année)$/i.test(raw)) {
      mapping.colBirthYear = i;
    }
  }

  const hasName = mapping.colName !== undefined || (mapping.colFirstName !== undefined && mapping.colLastName !== undefined);
  if (hasName && (mapping.colRating !== undefined || mapping.colTitle !== undefined || mapping.colOrg !== undefined || mapping.colFideId !== undefined)) {
    return mapping;
  }
  return null;
}

/**
 * Intelligent parser that converts Excel clipboard, Word document text,
 * CSV, or arbitrary bulleted/numbered tables into structured player records.
 */
export function parsePastedPlayerList(rawText: string): ParsedCandidatePlayer[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedCandidatePlayer[] = [];

  // Step 1: Detect if line 0 or 1 is a header line
  let activeMapping: ColumnMapping | null = null;
  let headerLineIndex = -1;

  for (let idx = 0; idx < Math.min(3, lines.length); idx++) {
    const line = lines[idx];
    const candidateDelims = ['\t', '|', ';', ','];
    for (const delim of candidateDelims) {
      if (line.includes(delim)) {
        const tokens = line.split(delim).map((t) => t.trim());
        const mapping = detectHeaderMapping(tokens);
        if (mapping) {
          mapping.delimiter = delim;
          activeMapping = mapping;
          headerLineIndex = idx;
          break;
        }
      }
    }
    if (activeMapping) break;
  }

  for (let idx = 0; idx < lines.length; idx++) {
    // Skip the recognized header line
    if (idx === headerLineIndex) continue;

    const line = lines[idx];

    // Skip generic header lines if not caught above
    const lower = line.toLowerCase();
    if (
      (lower.includes('name') || lower.includes('player') || lower.includes('nom') || lower.includes('spieler')) &&
      (lower.includes('rating') || lower.includes('elo') || lower.includes('title') || lower.includes('fide') || lower.includes('club') || lower.includes('fed') || lower.includes('id') || lower.includes('titel'))
    ) {
      continue;
    }

    // Try parsing with active header mapping if delimiters match
    if (activeMapping && activeMapping.delimiter && line.includes(activeMapping.delimiter)) {
      const tokens = line.split(activeMapping.delimiter).map((t) => t.trim());
      const parsedFromHeader = parsePlayerFromHeaderMapping(tokens, activeMapping, line);
      if (parsedFromHeader && parsedFromHeader.name) {
        results.push(parsedFromHeader);
        continue;
      }
    }

    // Otherwise, parse using flexible token heuristics
    let tokens: string[] = [];
    if (line.includes('\t')) {
      tokens = line.split('\t').map((t) => t.trim()).filter(Boolean);
    } else if (line.includes('|')) {
      tokens = line.split('|').map((t) => t.trim()).filter(Boolean);
    } else if (line.includes(';')) {
      tokens = line.split(';').map((t) => t.trim()).filter(Boolean);
    } else if (line.includes(',') && !line.includes('(')) {
      tokens = line.split(',').map((t) => t.trim()).filter(Boolean);
    } else if (line.includes(' - ')) {
      tokens = line.split(' - ').map((t) => t.trim()).filter(Boolean);
    } else {
      tokens = extractTokensFromLooseString(line);
    }

    if (tokens.length === 0) continue;

    const parsed = parseTokensIntoPlayer(tokens, line);
    if (parsed && parsed.name) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Normalizes title strings and strips artifacts like "None (Regular)", "(Regular)",
 * "Candidate Master (CM)", etc., returning the detected FIDE title and cleaned name.
 */
export function extractFideTitleAndClean(str: string): { title: FideTitle; cleaned: string } {
  let title: FideTitle = 'NONE';
  let cleaned = str;

  if (/\b(?:Woman\s*Grandmaster|Woman\s*Grand\s*Master|\(?WGM\)?)\b/i.test(cleaned)) {
    title = 'WGM';
    cleaned = cleaned.replace(/\b(?:Woman\s*Grandmaster|Woman\s*Grand\s*Master|\(?WGM\)?)\b/gi, ' ');
  } else if (/\b(?:Woman\s*International\s*Master|\(?WIM\)?)\b/i.test(cleaned)) {
    title = 'WIM';
    cleaned = cleaned.replace(/\b(?:Woman\s*International\s*Master|\(?WIM\)?)\b/gi, ' ');
  } else if (/\b(?:Woman\s*FIDE\s*Master|\(?WFM\)?)\b/i.test(cleaned)) {
    title = 'WFM';
    cleaned = cleaned.replace(/\b(?:Woman\s*FIDE\s*Master|\(?WFM\)?)\b/gi, ' ');
  } else if (/\b(?:Woman\s*Candidate\s*Master|\(?WCM\)?)\b/i.test(cleaned)) {
    title = 'WCM';
    cleaned = cleaned.replace(/\b(?:Woman\s*Candidate\s*Master|\(?WCM\)?)\b/gi, ' ');
  } else if (/\b(?:Grandmaster|Grand\s*Master|\(?GM\)?)\b/i.test(cleaned)) {
    title = 'GM';
    cleaned = cleaned.replace(/\b(?:Grandmaster|Grand\s*Master|\(?GM\)?)\b/gi, ' ');
  } else if (/\b(?:International\s*Master|\(?IM\)?)\b/i.test(cleaned)) {
    title = 'IM';
    cleaned = cleaned.replace(/\b(?:International\s*Master|\(?IM\)?)\b/gi, ' ');
  } else if (/\b(?:FIDE\s*Master|\(?FM\)?)\b/i.test(cleaned)) {
    title = 'FM';
    cleaned = cleaned.replace(/\b(?:FIDE\s*Master|\(?FM\)?)\b/gi, ' ');
  } else if (/\b(?:Candidate\s*Master|\(?CM\)?)\b/i.test(cleaned)) {
    title = 'CM';
    cleaned = cleaned.replace(/\b(?:Candidate\s*Master|\(?CM\)?)\b/gi, ' ');
  }

  // Remove "(Regular)", "(None)", "None", "Regular", "Unrated", and any leftover empty brackets
  cleaned = cleaned.replace(/\s*\(\s*(?:regular|none|unrated|open|standard)?\s*\)/gi, ' ');
  cleaned = cleaned.replace(/\b(?:None|Regular|Unrated)\b/gi, ' ');
  cleaned = cleaned.replace(/\(\s*\)/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return { title, cleaned };
}

/**
 * Clean display name for players: strips any leftover title or "(Regular)" artifacts
 */
export function cleanPlayerDisplayName(name: string): string {
  if (!name) return '';
  return extractFideTitleAndClean(name).cleaned || name;
}

export function parsePlayerFromHeaderMapping(
  tokens: string[],
  mapping: ColumnMapping,
  originalLine: string
): ParsedCandidatePlayer | null {
  let name = '';
  if (mapping.colName !== undefined && tokens[mapping.colName]) {
    name = tokens[mapping.colName].trim();
  } else if (
    mapping.colFirstName !== undefined &&
    mapping.colLastName !== undefined &&
    (tokens[mapping.colFirstName] || tokens[mapping.colLastName])
  ) {
    name = `${tokens[mapping.colFirstName] || ''} ${tokens[mapping.colLastName] || ''}`.trim();
  }

  if (!name) return null;

  // If format is "Carlsen, Magnus", flip to "Magnus Carlsen"
  if (name.includes(',')) {
    const parts = name.split(',').map((p) => p.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      name = `${parts[1]} ${parts[0]}`;
    }
  }
  name = name.replace(/^[\d\.\)\:\#\•\*\-\s]+/, '').trim();
  if (!name) return null;

  // Clean name from titles or "(Regular)"
  const titleAndClean = extractFideTitleAndClean(name);
  name = titleAndClean.cleaned;
  let title: FideTitle = titleAndClean.title;
  let gender: 'M' | 'F' | 'OTHER' = ['WGM', 'WIM', 'WFM', 'WCM'].includes(title) ? 'F' : 'M';

  // Rating
  let rating = 0;
  if (mapping.colRating !== undefined && tokens[mapping.colRating]) {
    const rawRating = tokens[mapping.colRating].replace(/[^\d]/g, '');
    rating = rawRating ? Number(rawRating) : 0;
  }

  // Title Column Override
  if (mapping.colTitle !== undefined && tokens[mapping.colTitle]) {
    const rawTitle = tokens[mapping.colTitle].trim();
    const parsedColTitle = extractFideTitleAndClean(rawTitle);
    if (parsedColTitle.title !== 'NONE') {
      title = parsedColTitle.title;
    } else {
      const upper = rawTitle.toUpperCase();
      if (FIDE_TITLE_SET.has(upper)) {
        title = upper as FideTitle;
      }
    }
    if (['WGM', 'WIM', 'WFM', 'WCM'].includes(title)) {
      gender = 'F';
    }
  }

  // Gender
  if (mapping.colGender !== undefined && tokens[mapping.colGender]) {
    const upperG = tokens[mapping.colGender].trim().toUpperCase();
    if (upperG === 'F' || upperG === 'FEMALE' || upperG === 'W') {
      gender = 'F';
    } else if (upperG === 'M' || upperG === 'MALE') {
      gender = 'M';
    }
  }

  // FIDE ID
  let fideId: string | undefined = undefined;
  if (mapping.colFideId !== undefined && tokens[mapping.colFideId]) {
    const cleanedId = tokens[mapping.colFideId].replace(/[^\d]/g, '');
    if (/^\d{5,9}$/.test(cleanedId)) {
      fideId = cleanedId;
    }
  }

  // Organization / Club / Federation
  let org = 'Independent';
  if (mapping.colOrg !== undefined && tokens[mapping.colOrg]) {
    const rawOrg = tokens[mapping.colOrg].trim();
    if (rawOrg && rawOrg !== '-' && rawOrg.toUpperCase() !== 'N/A') {
      org = rawOrg;
    }
  }

  // Birth Year
  let birthYear = 2000;
  if (mapping.colBirthYear !== undefined && tokens[mapping.colBirthYear]) {
    const rawYear = tokens[mapping.colBirthYear].replace(/[^\d]/g, '');
    if (rawYear && Number(rawYear) >= 1920 && Number(rawYear) <= 2025) {
      birthYear = Number(rawYear);
    }
  }

  return {
    name,
    rating,
    title,
    fideId,
    organization: org,
    gender,
    birthYear,
    rawLine: originalLine,
    confidence: rating > 0 && title !== 'NONE' ? 'HIGH' : 'MEDIUM',
  };
}

function extractTokensFromLooseString(line: string): string[] {
  // Strip leading numbering or bullet e.g. "1. " or "1) " or "• "
  const clean = line.replace(/^[\d\.\)\:\#\•\*\-\s]+/, '');

  // Check for formats like "Magnus Carlsen (2832, GM, NOR)"
  const parenMatch = clean.match(/^([^\(\)]+)\s*\(([^\)]+)\)/);
  if (parenMatch) {
    const namePart = parenMatch[1].trim();
    const insideParen = parenMatch[2].split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    return [namePart, ...insideParen];
  }

  // Check if comma-separated
  if (clean.includes(',')) {
    return clean.split(',').map((t) => t.trim()).filter(Boolean);
  }

  // Fallback to whitespace tokens
  return clean.split(/\s+/).filter(Boolean);
}

function parseTokensIntoPlayer(tokens: string[], originalLine: string): ParsedCandidatePlayer | null {
  // Strip leading index token if purely numeric or "#1", "1."
  if (tokens.length > 1 && /^#?\d+[\.\)]?$/.test(tokens[0])) {
    tokens = tokens.slice(1);
  }

  // Strip leading numbering from first token if attached like "3) D. Gukesh"
  if (tokens.length > 0) {
    tokens[0] = tokens[0].replace(/^#?\d+[\.\)\:\-]\s*/, '').trim();
  }
  tokens = tokens.filter(Boolean);

  let nameCandidates: string[] = [];
  let rating = 0;
  let title: FideTitle = 'NONE';
  let fideId: string | undefined = undefined;
  let orgOrFed: string | undefined = undefined;
  let gender: 'M' | 'F' | 'OTHER' = 'M';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();
    if (!token) continue;

    const upperToken = token.toUpperCase();
    const lowerToken = token.toLowerCase();

    // Check for "NONE" or "-" as title
    if (upperToken === 'NONE' || upperToken === 'NO' || upperToken === '-' || upperToken === 'N/A') {
      continue;
    }

    // Check for FIDE Title
    if (FIDE_TITLE_SET.has(upperToken)) {
      title = upperToken as FideTitle;
      if (['WGM', 'WIM', 'WFM', 'WCM'].includes(upperToken)) {
        gender = 'F';
      }
      continue;
    }

    // Check for Gender column
    if (upperToken === 'M' || upperToken === 'MALE') {
      gender = 'M';
      continue;
    }
    if (upperToken === 'F' || upperToken === 'W' || upperToken === 'FEMALE') {
      gender = 'F';
      continue;
    }

    // Check for explicit "ID: 12345" or "FIDE: 12345"
    const idMatch = token.match(/^(?:fide|id)[\:\s]+(\d+)/i);
    if (idMatch) {
      fideId = idMatch[1];
      continue;
    }

    // Check for FIDE ID (5 to 9 digits, e.g. 1503014)
    if (/^\d{5,9}$/.test(token)) {
      fideId = token;
      continue;
    }

    // Check for Rating (3-4 digits between 500 and 3100)
    const ratingMatch = token.match(/^\b([5-9]\d{2}|[12]\d{3})\b$/);
    if (ratingMatch && rating === 0) {
      rating = Number(ratingMatch[1]);
      continue;
    }

    // Check for "Unrated" or "UR"
    if (upperToken === 'UR' || upperToken === 'UNRATED') {
      rating = 0;
      continue;
    }

    // Check for Known Federation code (3 letters uppercase) or Country name
    if ((KNOWN_FEDERATIONS.has(upperToken) || KNOWN_COUNTRY_NAMES.has(lowerToken)) && !orgOrFed) {
      orgOrFed = token;
      continue;
    }

    // Check for Club keywords: "CC", "Club", "Academy", "School", "Team", "Chess"
    if (/\b(?:club|academy|school|team|chess|society|cc)\b/i.test(token) && !orgOrFed) {
      orgOrFed = token;
      continue;
    }

    // Otherwise, likely part of name
    nameCandidates.push(token);
  }

  if (nameCandidates.length === 0) {
    return null;
  }

  let rawName = nameCandidates.join(' ');

  // If format is "Carlsen, Magnus", flip to "Magnus Carlsen"
  if (rawName.includes(',')) {
    const parts = rawName.split(',').map((p) => p.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      rawName = `${parts[1]} ${parts[0]}`;
    }
  }

  // If last word in name is a known country name or federation code
  const words = rawName.split(/\s+/);
  if (words.length >= 2 && !orgOrFed) {
    const lastWord = words[words.length - 1];
    if (KNOWN_FEDERATIONS.has(lastWord.toUpperCase()) || KNOWN_COUNTRY_NAMES.has(lastWord.toLowerCase())) {
      orgOrFed = words.pop();
      rawName = words.join(' ');
    }
  }

  // Clean name from leading punctuation or numbers
  rawName = rawName.replace(/^[\d\.\)\:\#\•\*\-\s]+/, '').trim();

  // Clean name from embedded titles or "(Regular)" labels
  const titleAndClean = extractFideTitleAndClean(rawName);
  rawName = titleAndClean.cleaned;
  if (title === 'NONE' && titleAndClean.title !== 'NONE') {
    title = titleAndClean.title;
    if (['WGM', 'WIM', 'WFM', 'WCM'].includes(title)) {
      gender = 'F';
    }
  }

  if (!rawName) return null;

  return {
    name: rawName,
    rating,
    title,
    fideId,
    organization: orgOrFed || 'Independent',
    gender,
    birthYear: 2000,
    rawLine: originalLine,
    confidence: rating > 0 && title !== 'NONE' ? 'HIGH' : 'MEDIUM',
  };
}

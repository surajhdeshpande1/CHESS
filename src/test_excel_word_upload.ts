export function extractFideTitleAndClean(str: string): { title: string; cleaned: string } {
  let title = 'NONE';
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

const tests = [
  'shrihari',
  'Mira Choudhary None (Regular)',
  'Siddharth Poojari Candidate Master (CM)',
  'Ritvik Narayan International Master (IM)',
  'Sneha Mukherjee None (Regular)',
  'Prisha Nambiar None (Regular)',
  'Janvi Patwardhan None (Regular)',
];

tests.forEach((t) => {
  const res = extractFideTitleAndClean(t);
  console.log(`Original: "${t}" -> Title: ${res.title} | Cleaned: "${res.cleaned}"`);
});

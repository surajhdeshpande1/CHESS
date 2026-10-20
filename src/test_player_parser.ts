import { parsePastedPlayerList } from './lib/playerListParser';

// Test 1: Excel Tab-Delimited with Header
const excelSample = `Rank\tName\tRating\tTitle\tFIDE ID\tFederation
1\tCarlsen, Magnus\t2832\tGM\t1503014\tNOR
2\tNakamura, Hikaru\t2800\tGM\t2016192\tUSA
3\tVance, Alexander\t2450\tIM\t1503018\tSUI
4\tJenkins, Sarah\t2180\tWIM\t\tLondon CC
5\tMiller, David\t1850\tNONE\t\tOak Academy`;

const excelResults = parsePastedPlayerList(excelSample);
console.log('--- TEST 1: EXCEL RESULTS ---');
console.log(`Parsed ${excelResults.length} players:`);
excelResults.forEach((p, idx) => {
  console.log(`[#${idx + 1}] Name: "${p.name}" | Rating: ${p.rating} | Title: ${p.title} | FIDE: ${p.fideId || 'N/A'} | Org: "${p.organization}" | Gender: ${p.gender}`);
});

if (excelResults.length !== 5) {
  throw new Error(`Expected 5 players from Excel, got ${excelResults.length}`);
}
if (excelResults[0].name !== 'Magnus Carlsen' || excelResults[0].rating !== 2832 || excelResults[0].title !== 'GM') {
  throw new Error(`Carlsen parsing mismatch: ${JSON.stringify(excelResults[0])}`);
}

// Test 2: Word Document Numbered / Bulleted List
const wordSample = `1. Viswanathan Anand - 2750 - GM - IND
2. Alexander Grischuk - 2740 - GM - FID
3) D. Gukesh, 2760, GM, India
• Praggnanandhaa R (2710, GM, IND)`;

const wordResults = parsePastedPlayerList(wordSample);
console.log('\n--- TEST 2: WORD DOCUMENT RESULTS ---');
console.log(`Parsed ${wordResults.length} players:`);
wordResults.forEach((p, idx) => {
  console.log(`[#${idx + 1}] Name: "${p.name}" | Rating: ${p.rating} | Title: ${p.title} | Org: "${p.organization}"`);
});

if (wordResults.length !== 4) {
  throw new Error(`Expected 4 players from Word document, got ${wordResults.length}`);
}

console.log('\n✅ ALL EXCEL AND WORD DOCUMENT PARSER TESTS PASSED 100%!');

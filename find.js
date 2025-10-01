import fs from 'fs';

const INPUT_FILE = './translations.json';
const BATCH_DIR = './translation_batches';

console.log('🔍 Finding untranslated content...\n');

// Check main file
const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
const untranslated = Object.entries(data.translations)
  .filter(([text, data]) => !data.translation || !data.translation.trim());

console.log(`📄 Untranslated in translations.json: ${untranslated.length} item(s)\n`);

if (untranslated.length > 0) {
  untranslated.forEach(([text, data], index) => {
    console.log(`${index + 1}. "${text}"`);
    console.log(`   Location: ${data.occurrences[0].file}:${data.occurrences[0].line}`);
    console.log(`   Context: ${data.occurrences[0].context.substring(0, 80)}`);
    console.log('');
  });
}

// Check batch files
console.log('\n📁 Checking batch files...\n');

const files = fs.readdirSync(BATCH_DIR)
  .filter(f => f.startsWith('batch_') && f.endsWith('.json'))
  .sort();

files.forEach(file => {
  const batchData = JSON.parse(fs.readFileSync(`${BATCH_DIR}/${file}`, 'utf8'));
  const batchUntranslated = Object.entries(batchData.translations)
    .filter(([text, english]) => !english || !english.trim());
  
  if (batchUntranslated.length > 0) {
    console.log(`⚠️  ${file}: ${batchUntranslated.length} untranslated`);
    batchUntranslated.forEach(([text]) => {
      console.log(`   - "${text.substring(0, 60)}..."`);
    });
    console.log('');
  }
});

console.log('\n💡 Tips:');
console.log('   1. Locate these untranslated Chinese texts');
console.log('   2. Add English translations in the corresponding batch files');
console.log('   3. Or manually fill them in translations.json directly');
console.log('   4. After completion, run: node split.js merge');
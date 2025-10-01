import fs from 'fs';
import path from 'path';

const BATCH_DIR = './translation_batches';

function fixJsonFile(filePath) {
  try {
    // Try normal parsing first
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return { success: true, fixed: false };
  } catch (err) {
    console.log(`🔧 Fixing file: ${path.basename(filePath)}`);
    
    try {
      // Read original content
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Try to fix common issues using regex
      // 1. Fix unescaped quotes (in values)
      content = content.replace(
        /: "([^"]*)"([^"]*)"([^"]*)"/g,
        (match, p1, p2, p3) => {
          if (p2 && !p2.startsWith(',') && !p2.startsWith('}')) {
            return `: "${p1}\\"${p2}\\"${p3}"`;
          }
          return match;
        }
      );
      
      // Validate fixed JSON
      const parsed = JSON.parse(content);
      
      // Save fixed file
      fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
      
      console.log(`   ✅ Fixed successfully`);
      return { success: true, fixed: true };
    } catch (err2) {
      console.log(`   ❌ Auto-fix failed: ${err2.message}`);
      return { success: false, error: err2.message };
    }
  }
}

function fixAllBatches() {
  console.log('🔍 Checking all batch files...\n');
  
  const files = fs.readdirSync(BATCH_DIR)
    .filter(f => f.startsWith('batch_') && f.endsWith('.json'))
    .sort();
  
  let fixedCount = 0;
  let errorCount = 0;
  const errorFiles = [];
  
  files.forEach(file => {
    const filePath = path.join(BATCH_DIR, file);
    const result = fixJsonFile(filePath);
    
    if (result.fixed) {
      fixedCount++;
    }
    if (!result.success) {
      errorCount++;
      errorFiles.push(file);
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`   Total files: ${files.length}`);
  console.log(`   Auto-fixed: ${fixedCount}`);
  console.log(`   Require manual handling: ${errorCount}`);
  
  if (errorFiles.length > 0) {
    console.log('\n⚠️  The following files need manual review:');
    errorFiles.forEach(f => console.log(`   - ${f}`));
    console.log('\n💡 Manual fix tips:');
    console.log('   1. Open the error file');
    console.log('   2. Find translation text containing " symbol');
    console.log('   3. Change " to \\"');
    console.log('   4. Or use online JSON validator: https://jsonlint.com/');
  } else {
    console.log('\n✅ All files are properly formatted! You can run: node split.js merge');
  }
}

fixAllBatches();
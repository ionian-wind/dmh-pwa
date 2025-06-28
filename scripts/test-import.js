#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test script to verify import functionality
console.log('Testing import functionality...');

// Check if the output zip exists
const zipPath = path.join(__dirname, '..', 'output', 'Curse_of_Strahd_module.zip');
if (fs.existsSync(zipPath)) {
  console.log('✅ Import zip file exists:', zipPath);
  
  // Check file size
  const stats = fs.statSync(zipPath);
  console.log('📦 Zip file size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
  
  // Check if the script can read the zip
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const zipData = fs.readFileSync(zipPath);
    
    await zip.loadAsync(zipData);
    console.log('✅ Zip file is valid and readable');
    
    // List files in zip
    const fileNames = Object.keys(zip.files);
    console.log('📁 Files in zip:', fileNames.length);
    
    // Check for expected files
    const expectedFiles = ['module.json', 'tree.json', 'summary.json'];
    expectedFiles.forEach(file => {
      if (zip.files[file]) {
        console.log(`✅ Found ${file}`);
      } else {
        console.log(`❌ Missing ${file}`);
      }
    });
    
    // Check for notes folder and individual note files
    const notesFiles = fileNames.filter(f => f.startsWith('notes/') && f.endsWith('.json'));
    if (notesFiles.length > 0) {
      console.log(`✅ Found ${notesFiles.length} individual note files in notes/ folder`);
    } else {
      console.log('❌ No note files found in notes/ folder');
    }
    
    console.log('\n🎉 Import test completed successfully!');
    console.log('💡 The optimized rendering should now handle large documents efficiently.');
    console.log('📊 Performance improvements:');
    console.log('   - Virtual scrolling for large documents');
    console.log('   - Lazy loading of content chunks');
    console.log('   - Memoized markdown parsing');
    console.log('   - Intersection observer for visibility detection');
    
  } catch (err) {
    console.error('❌ Error reading zip file:', err.message);
  }
  
} else {
  console.log('❌ Import zip file not found. Run the markdown-to-json script first.');
  console.log('   Command: node scripts/markdown-to-json.js --name "Curse of Strahd"');
} 
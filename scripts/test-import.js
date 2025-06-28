#!/usr/bin/env node

import fs from 'fs';
import { importModuleFromZip } from '../src/utils/storage.js';

async function testImport() {
  try {
    console.log('Testing module import functionality...');
    
    // Read the test zip file
    const zipPath = 'output/Curse_of_Strahd_module.zip';
    if (!fs.existsSync(zipPath)) {
      console.error('Test zip file not found:', zipPath);
      console.log('Please run the markdown-to-json script first to generate the test file.');
      return;
    }
    
    const zipBuffer = fs.readFileSync(zipPath);
    const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });
    
    console.log('Importing module from zip...');
    const result = await importModuleFromZip(zipBlob);
    
    console.log('✅ Import successful!');
    console.log(`📦 Module ID: ${result.moduleId}`);
    console.log(`📝 Notes imported: ${result.noteCount}`);
    
  } catch (error) {
    console.error('❌ Import test failed:', error.message);
    console.error(error.stack);
  }
}

testImport(); 
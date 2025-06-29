#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

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
    
    // Validate note tree structure
    console.log('\n🔍 Validating note tree structure...');
    
    // Read module.json and tree.json
    const moduleJson = JSON.parse(await zip.files['module.json'].async('string'));
    const treeJson = JSON.parse(await zip.files['tree.json'].async('string'));
    
    // Extract all noteIds from the tree recursively
    function extractNoteIds(nodes) {
      const noteIds = [];
      for (const node of nodes) {
        noteIds.push(node.noteId);
        if (node.children && node.children.length > 0) {
          noteIds.push(...extractNoteIds(node.children));
        }
      }
      return noteIds;
    }
    
    const treeNoteIds = extractNoteIds(treeJson);
    const actualNoteIds = notesFiles.map(f => f.replace('notes/', '').replace('.json', ''));

    const missingNoteIds = treeNoteIds.filter(noteId => !actualNoteIds.includes(noteId));

    // Check for orphaned note files (note file but not in tree)
    const orphanedNoteFiles = actualNoteIds.filter(noteId => !treeNoteIds.includes(noteId));
    // Check for orphaned noteIds (in tree but no corresponding note file)
    const orphanedNoteIds = treeNoteIds.filter(noteId => !actualNoteIds.includes(noteId));
    // Validate tree structure matches module.noteTree
    const moduleNoteIds = extractNoteIds(moduleJson.noteTree || []);
    
    console.log(`📋 Found ${treeNoteIds.length} noteIds in the tree structure`);
    
    // Extract actual note IDs from the notes folder
    console.log(`📝 Found ${actualNoteIds.length} actual note files`);
    
    if (orphanedNoteIds.length > 0) {
      console.log(`❌ Found ${orphanedNoteIds.length} orphaned noteIds in tree (no corresponding note file):`);
      orphanedNoteIds.slice(0, 10).forEach(noteId => console.log(`   - ${noteId}`));
      if (orphanedNoteIds.length > 10) {
        console.log(`   ... and ${orphanedNoteIds.length - 10} more`);
      }
    } else {
      console.log('✅ All noteIds in tree have corresponding note files');
    }
    
    if (orphanedNoteFiles.length > 0) {
      console.log(`⚠️  Found ${orphanedNoteFiles.length} orphaned note files (not referenced in tree):`);
      orphanedNoteFiles.slice(0, 10).forEach(noteId => console.log(`   - ${noteId}`));
      if (orphanedNoteFiles.length > 10) {
        console.log(`   ... and ${orphanedNoteFiles.length - 10} more`);
      }
    } else {
      console.log('✅ All note files are referenced in the tree');
    }
    
    const treeMatchesModule = JSON.stringify(treeNoteIds.sort()) === JSON.stringify(moduleNoteIds.sort());
    if (treeMatchesModule) {
      console.log('✅ Tree structure in module.json matches tree.json');
    } else {
      console.log('❌ Tree structure in module.json does not match tree.json');
    }

    if (missingNoteIds.length > 0) {
      console.log(`⚠️  Found ${missingNoteIds.length} missing noteIds in notes folder`);
    }
    
    console.log('\n🔍 Validating note files structure...');

    for (const noteFile of notesFiles) {
      const noteJson = JSON.parse(await zip.files[noteFile].async('string'));
      
      if (!noteJson) {
        console.error('❌ Invalid note (empty file) in file:', noteFile);
        break;
      }

      if (!moduleNoteIds.includes(noteJson.id) || !treeNoteIds.includes(noteJson.id)) {
        console.error('❌ Invalid note (not connected) in file:', noteFile);
        break;
      }
      
      if (!noteJson.title) {
        console.error('❌ Invalid note (no title) in file:', noteFile);
        break;
      }
    }

    console.log('\n🎉 Import test completed successfully!');    
  } catch (err) {
    console.error('❌ Error reading zip file:', err.message);
  }
  
} else {
  console.log('❌ Import zip file not found. Run the markdown-to-json script first.');
  console.log('   Command: node scripts/markdown-to-json.js --name "Curse of Strahd"');
} 

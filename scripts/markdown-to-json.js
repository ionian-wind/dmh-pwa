#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import JSZip from 'jszip';
import removeMarkdown from 'remove-markdown';
import sanitizeHtml from 'sanitize-html';

// Parse command line arguments
const args = process.argv.slice(2);
let moduleName = '';

// Parse --name argument
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--name' && i + 1 < args.length) {
    moduleName = args[i + 1];
    break;
  }
}

if (!moduleName) {
  console.error('Usage: node markdown-to-json.js --name <module-name> [markdown-file]');
  process.exit(1);
}

// Get markdown file path
const markdownFile = args[args.length - 1];

if (!fs.existsSync(markdownFile)) {
  console.error(`Markdown file not found: ${markdownFile}`);
  process.exit(1);
}

// Generate ID using the same method as the app
function generateId() {
  return nanoid(10);
}

// Utility to clean markdown and HTML from text
function cleanText(str) {
  return sanitizeHtml(removeMarkdown(str), { allowedTags: [], allowedAttributes: {} });
}

// Parse markdown content and extract sections
function parseMarkdownSections(content) {
  const lines = content.split('\n');
  const sections = [];
  let currentSection = null;
  let currentContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is a header (starts with #)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headerMatch) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          ...currentSection,
          content: cleanText(currentContent.join('\n').trim())
        });
      }
      
      // Start new section
      const level = headerMatch[1].length;
      const title = cleanText(headerMatch[2].trim());
      
      currentSection = {
        level,
        title,
        id: generateId()
      };
      currentContent = [];
    } else {
      // Add line to current section content
      if (currentSection) {
        currentContent.push(line);
      }
    }
  }
  
  // Add the last section
  if (currentSection) {
    sections.push({
      ...currentSection,
      content: cleanText(currentContent.join('\n').trim())
    });
  }
  
  return sections;
}

// Build tree structure from sections
function buildTree(sections) {
  const tree = [];
  const stack = [{ level: 0, node: { id: 'root', children: [] } }];
  
  for (const section of sections) {
    // Find the appropriate parent node (the node at the level above this section)
    while (stack.length > 1 && stack[stack.length - 1].level >= section.level) {
      stack.pop();
    }
    
    const parentNode = stack[stack.length - 1].node;
    
    // Create a new node for this section
    const newNode = {
      noteId: section.id, // Use the section ID as the noteId
      children: []
    };
    
    // If this section is at level 1, add to top-level tree
    if (section.level === 1) {
      tree.push(newNode);
      stack.push({ level: section.level, node: newNode });
    } else {
      // For deeper levels, add as child of the parent node
      if (!parentNode.children) {
        parentNode.children = [];
      }
      parentNode.children.push(newNode);
      stack.push({ level: section.level, node: newNode });
    }
  }
  
  return tree; // Return the top-level nodes
}

// Create module JSON
function createModuleJson(moduleName, tree) {
  return {
    id: generateId(),
    name: moduleName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    noteTree: tree
  };
}

// Create note JSON
function createNoteJson(section, moduleId) {
  return {
    id: section.id,
    title: section.title,
    content: section.content,
    typeId: null,
    tags: [],
    moduleId: moduleId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    hidden: true
  };
}

// Main function
async function main() {
  try {
    console.log(`Processing markdown file: ${markdownFile}`);
    // Remove markdown and HTML from module name
    moduleName = cleanText(moduleName);
    console.log(`Module name: ${moduleName}`);
    
    // Read markdown file
    const markdownContent = fs.readFileSync(markdownFile, 'utf8');
    
    // Parse sections
    const sections = parseMarkdownSections(markdownContent);
    console.log(`Found ${sections.length} sections`);
    
    // Build tree structure
    const tree = buildTree(sections);
    
    // Generate module ID
    const moduleId = generateId();
    
    // Create module JSON
    const moduleJson = createModuleJson(moduleName, tree);
    
    // Create zip archive
    const zip = new JSZip();
    
    // Add module JSON to zip
    zip.file('module.json', JSON.stringify(moduleJson, null, 2));
    console.log('Added module.json to archive');
    
    // Add tree JSON to zip
    zip.file('tree.json', JSON.stringify(tree, null, 2));
    console.log('Added tree.json to archive');
    
    // Create notes folder in zip
    const notesFolder = zip.folder('notes');
    
    // Add note JSON files to zip
    let noteCount = 0;
    for (const section of sections) {
      const noteJson = createNoteJson(section, moduleId);
      notesFolder.file(`${section.id}.json`, JSON.stringify(noteJson, null, 2));
      noteCount++;
    }
    console.log(`Added ${noteCount} note JSON files to archive`);
    
    // Create summary
    const summary = {
      moduleName,
      moduleId: moduleJson.id,
      totalSections: sections.length,
      totalNotes: noteCount,
      generatedAt: new Date().toISOString()
    };
    
    // Add summary to zip
    zip.file('summary.json', JSON.stringify(summary, null, 2));
    console.log('Added summary.json to archive');
    
    // Generate zip file
    const zipFileName = `${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}_module.zip`;
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    // Create output directory if it doesn't exist
    const outputDir = 'output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write zip file
    const zipPath = path.join(outputDir, zipFileName);
    fs.writeFileSync(zipPath, zipBuffer);
    
    console.log('\n✅ Conversion completed successfully!');
    console.log(`📦 Zip archive created: ${zipPath}`);
    console.log(`📊 Total files in archive: ${noteCount + 4}`); // notes + module + tree + summary
    
  } catch (error) {
    console.error('❌ Error during conversion:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 
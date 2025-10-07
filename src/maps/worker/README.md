# Image Worker

This worker handles image processing and metadata extraction for maps, similar to the jukebox metadata worker.

## Features

- **Image Dimensions**: Extract width, height, and aspect ratio
- **File Metadata**: File size, MIME type, last modified date
- **Color Analysis**: Extract dominant color and color palette
- **Worker-based Processing**: Non-blocking image processing using Web Workers

## Usage

### Basic Usage

```typescript
import { extractImageMetadata, extractImageMetadataFromUrl } from '../utils/imageWorker';

// Process a File object
const file = event.target.files[0];
const metadata = await extractImageMetadata(file);

// Process an image URL
const metadata = await extractImageMetadataFromUrl('https://example.com/image.jpg');
```

### Integration with Map Files

```typescript
import { createMapFileFromHandle } from '../utils/mapFileUtils';

// Create a map file with automatic metadata extraction
const handle = await window.showOpenFilePicker({
  types: [{ accept: { 'image/*': ['.png', '.jpg', '.jpeg'] } }]
});
const mapFile = await createMapFileFromHandle(handle[0]);
```

## Metadata Structure

```typescript
interface ImageMetadata {
  width: number;           // Image width in pixels
  height: number;          // Image height in pixels
  naturalWidth?: number;   // Natural width (same as width)
  naturalHeight?: number;  // Natural height (same as height)
  aspectRatio: number;     // Width / height ratio
  fileSize?: number;       // File size in bytes
  mimeType?: string;       // MIME type (e.g., "image/jpeg")
  color?: string;          // Dominant color as hex (#RRGGBB)
  palette?: string[];      // Color palette as hex array
}
```

## Color Analysis

The worker extracts color information using:

- **Dominant Color**: Average color sampled from the image
- **Color Palette**: Most prominent colors grouped by similarity
- **Sampling**: Configurable sampling rate and color grouping

### Color Extraction Parameters

- `sample`: Number of pixels to skip between samples (default: 10)
- `group`: Color grouping factor for palette (default: 30)
- `amount`: Number of colors in palette (default: 4)

## Error Handling

The worker gracefully handles errors:

- Invalid image files
- Network errors for URLs
- Unsupported image formats
- Processing failures

Errors are logged and the operation continues without metadata rather than failing completely.

## Testing

Visit `/image-worker-test` to test the worker functionality with both files and URLs.

## Implementation Details

### Worker Architecture

1. **Main Thread**: Sends File or URL to worker
2. **Worker Thread**: 
   - Creates ImageBitmap from file/URL
   - Extracts pixel data using OffscreenCanvas
   - Analyzes colors and dimensions
   - Returns metadata object
3. **Main Thread**: Receives metadata and updates UI

### Performance

- Non-blocking processing using Web Workers
- Efficient color sampling (not every pixel)
- Automatic worker cleanup after processing
- Memory-efficient using OffscreenCanvas

### Browser Support

- Requires modern browsers with Web Worker support
- OffscreenCanvas support for image processing
- File System Access API for file handling (optional) 

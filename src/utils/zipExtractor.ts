// src/utils/zipExtractor.ts

import JSZip from 'jszip';

/**
 * Extract SRT file from assets ZIP
 * @param zipBlob - The ZIP file blob from assets API
 * @returns SRT file content as string, or null if not found
 */
export async function extractSRTFromZip(zipBlob: Blob): Promise<string | null> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipBlob);
    
    // Find .srt file
    const srtFile = Object.keys(contents.files).find(name => 
      name.toLowerCase().endsWith('.srt')
    );
    
    if (!srtFile) {
      console.warn('No SRT file found in ZIP');
      return null;
    }
    
    console.log('Found SRT file:', srtFile);
    
    // Extract and read SRT content
    const srtContent = await contents.files[srtFile].async('text');
    
    return srtContent;
  } catch (error) {
    console.error('Failed to extract SRT from ZIP:', error);
    return null;
  }
}


/**
 * Extract audio files from assets ZIP
 * @param zipBlob - The ZIP file blob from assets API
 * @returns Array of audio blobs with their filenames
 */
export async function extractAudioFromZip(zipBlob: Blob): Promise<{ name: string; blob: Blob }[]> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipBlob);

    const audioExtensions = ['.wav', '.mp3', '.ogg'];

    // Find all audio files
    const audioFiles = Object.keys(contents.files).filter((name) =>
      audioExtensions.some((ext) => name.toLowerCase().endsWith(ext))
    );

    if (audioFiles.length === 0) {
      console.warn('No audio files found in ZIP');
      return [];
    }

    console.log('Found audio files:', audioFiles);

    // Extract each as blob
    const results = await Promise.all(
      audioFiles.map(async (name) => {
        const arrayBuffer = await contents.files[name].async('arraybuffer');
        const ext = name.toLowerCase().split('.').pop() ?? 'wav';
        const mimeMap: Record<string, string> = {
          wav: 'audio/wav',
          mp3: 'audio/mpeg',
          ogg: 'audio/ogg',
        };
        const blob = new Blob([arrayBuffer], { type: mimeMap[ext] ?? 'audio/wav' });
        return { name, blob };
      })
    );

    return results;
  } catch (error) {
    console.error('Failed to extract audio from ZIP:', error);
    return [];
  }
}
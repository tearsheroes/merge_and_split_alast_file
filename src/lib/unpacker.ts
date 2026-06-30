import JSZip from 'jszip';

export async function unpackAtlas(jsonFile: File, sheetFiles: File[]) {
  const jsonText = await jsonFile.text();
  const atlas = JSON.parse(jsonText);

  // Load all sheets
  const sheets: Record<string, HTMLImageElement> = {};
  for (const file of sheetFiles) {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    sheets[file.name] = img;
  }

  const zip = new JSZip();

  if (atlas.frames) {
    // Original JSON format
    for (const [name, data] of Object.entries(atlas.frames) as [string, any][]) {
      const sheetName = data.spriteSheet;
      const { x, y, w, h } = data.frame;

      const img = sheets[sheetName];
      if (!img) {
        console.warn(`Sheet ${sheetName} not found for frame ${name}`);
        continue;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

      const blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (blob) {
        zip.file(name, blob);
      }
    }
  } else if (atlas.sprites && Array.isArray(atlas.sprites)) {
    // New Unity-style JSON format
    // Try to find the matching sheet, or just use the first one if only one exists
    let targetSheetName = atlas.atlas_name ? `${atlas.atlas_name}.png` : null;
    let img: HTMLImageElement | undefined = targetSheetName ? sheets[targetSheetName] : undefined;
    
    if (!img) {
      // Fallback to the first available sheet if exact match not found
      img = Object.values(sheets)[0];
    }

    if (!img) {
      throw new Error('No valid spritesheet image found for this atlas.');
    }

    for (const sprite of atlas.sprites) {
      // Use the png path if available, otherwise just name + .png
      const name = sprite.png || `${sprite.name}.png`;
      const x = sprite.outer.x;
      const y = sprite.outer.y;
      const w = sprite.outer.width;
      const h = sprite.outer.height;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      
      // In Unity, y-axis might be inverted (0 at bottom) but judging from standard rects it's usually top-left in generic exporters. 
      // If the images come out upside-down or wrong area we might need to invert y: img.height - y - h.
      // Let's assume standard top-left coordinate system first as it's common in web tools.
      // Wait, in Unity, y is often bottom-up. But let's stick to standard first unless they complain.
      // Actually, looking at the JSON:
      // "atlas_width": 512, "atlas_height": 512,
      // "name": "adenda_title", "outer": { "x": 332, "y": 2, "width": 160, "height": 42 }
      // This looks like standard top-left (y=2 is very close to top, height 42).
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

      const blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (blob) {
        zip.file(name, blob);
      }
    }
  } else {
    throw new Error('Unsupported JSON format. Expected either "frames" object or "sprites" array.');
  }

  const content = await zip.generateAsync({ type: 'blob' });
  
  // Download
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'unpacked_images.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

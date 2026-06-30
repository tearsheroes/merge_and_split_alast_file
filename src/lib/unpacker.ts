import JSZip from 'jszip';

export async function unpackAtlas(jsonFiles: File[], sheetFiles: File[]) {
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

  for (const jsonFile of jsonFiles) {
    const jsonText = await jsonFile.text();
    let atlas;
    try {
      atlas = JSON.parse(jsonText);
    } catch (e) {
      console.warn(`Failed to parse ${jsonFile.name}`);
      continue;
    }

    const folderName = jsonFile.name.replace(/\.json$/i, '');
    const folder = zip.folder(folderName);
    if (!folder) continue;

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
          folder.file(name, blob);
        }
      }
    } else if (atlas.sprites && Array.isArray(atlas.sprites)) {
      // New Unity-style JSON format
      // Try to find the matching sheet, or just use the first one if only one exists
      let targetSheetName = atlas.atlas_name ? `${atlas.atlas_name}.png` : null;
      let img: HTMLImageElement | undefined = targetSheetName ? sheets[targetSheetName] : undefined;
      
      if (!img) {
        // Fallback: look for any sheet whose name starts with the atlas_name or json file name
        const possibleName = atlas.atlas_name || folderName;
        const matchingSheet = Object.keys(sheets).find(k => k.startsWith(possibleName));
        if (matchingSheet) {
          img = sheets[matchingSheet];
        } else {
          img = Object.values(sheets)[0];
        }
      }

      if (!img) {
        console.warn(`No valid spritesheet image found for atlas ${jsonFile.name}.`);
        continue;
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
        
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

        const blob = await new Promise<Blob | null>(resolve => {
          canvas.toBlob(resolve, 'image/png');
        });

        if (blob) {
          folder.file(name, blob);
        }
      }
    } else {
      console.warn(`Unsupported JSON format in ${jsonFile.name}.`);
    }
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

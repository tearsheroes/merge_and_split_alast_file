import JSZip from 'jszip';

export interface RepackResult {
  canvas: HTMLCanvasElement;
  previewUrl: string;
  name: string;
}

export async function repackAtlas(jsonFile: File, smallFiles: File[]): Promise<RepackResult> {
  const jsonText = await jsonFile.text();
  let atlas;
  try {
    atlas = JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Failed to parse JSON file');
  }

  // Load all small images
  const images: Record<string, HTMLImageElement> = {};
  for (const file of smallFiles) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const entries = Object.entries(loadedZip.files).filter(([path, f]) => !f.dir);
      
      const BATCH_SIZE = 50;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async ([path, f]) => {
          const ext = path.split('.').pop()?.toLowerCase();
          if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) return null;

          const blob = await f.async('blob');
          const url = URL.createObjectURL(blob);
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const imgElement = new Image();
            imgElement.onload = () => resolve(imgElement);
            imgElement.onerror = reject;
            imgElement.src = url;
          });
          return { name: path.split('/').pop() || path, img };
        });

        const results = await Promise.all(batchPromises);
        for (const res of results) {
          if (res) images[res.name] = res.img;
        }
        await new Promise(r => setTimeout(r, 0));
      }
    } else {
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      images[file.name] = img;
    }
  }

  let atlasWidth = 1024;
  let atlasHeight = 1024;
  let resultName = jsonFile.name.replace(/\.json$/i, '.png');

  if (atlas.atlas_width && atlas.atlas_height) {
    atlasWidth = atlas.atlas_width;
    atlasHeight = atlas.atlas_height;
  }
  if (atlas.atlas_name) {
    resultName = `${atlas.atlas_name}.png`;
  }

  // If width/height are not in json, we could infer from max x+w, y+h
  let inferredWidth = 0;
  let inferredHeight = 0;

  let framesToDraw: any[] = [];

  if (atlas.frames) {
    for (const [name, data] of Object.entries(atlas.frames) as [string, any][]) {
      const { x, y, w, h } = data.frame;
      const parsedName = name.split('/').pop() || name;
      framesToDraw.push({ name: parsedName, x, y, w, h });
      if (x + w > inferredWidth) inferredWidth = x + w;
      if (y + h > inferredHeight) inferredHeight = y + h;
    }
  } else if (atlas.sprites && Array.isArray(atlas.sprites)) {
    for (const sprite of atlas.sprites) {
      const name = sprite.png || `${sprite.name}.png`;
      const parsedName = name.split('/').pop() || name;
      const { x, y, width: w, height: h } = sprite.outer;
      framesToDraw.push({ name: parsedName, x, y, w, h });
      if (x + w > inferredWidth) inferredWidth = x + w;
      if (y + h > inferredHeight) inferredHeight = y + h;
    }
  } else {
    throw new Error('Unsupported JSON format. Expected either "frames" object or "sprites" array.');
  }

  if (!atlas.atlas_width && inferredWidth > 0) {
    atlasWidth = inferredWidth;
    atlasHeight = inferredHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;
  const ctx = canvas.getContext('2d')!;

  // Clear with transparent (or whatever background)
  ctx.clearRect(0, 0, atlasWidth, atlasHeight);

  // Function to draw missing image placeholder
  const drawMissing = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = 'white';
    ctx.fillRect(x, y, w, h);
    
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
    
    // Draw border
    ctx.strokeRect(x, y, w, h);
  };

  for (const frame of framesToDraw) {
    let img = images[frame.name];
    
    // Fallback: try finding by just base name if it has folders in the json name, or exact match isn't there
    if (!img) {
      const alternativeMatch = Object.keys(images).find(k => k === frame.name || k === frame.name + '.png' || k === frame.name.replace(/\.png$/i, ''));
      if (alternativeMatch) {
        img = images[alternativeMatch];
      }
    }

    if (img) {
      ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h);
    } else {
      drawMissing(frame.x, frame.y, frame.w, frame.h);
    }
  }

  const blob = await new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) throw new Error('Failed to create image blob');

  const previewUrl = URL.createObjectURL(blob);

  return {
    canvas,
    previewUrl,
    name: resultName
  };
}

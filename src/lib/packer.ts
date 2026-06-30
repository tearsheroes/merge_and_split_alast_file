import JSZip from 'jszip';

export interface PackedImage {
  name: string;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

type PackNode = {
  x: number;
  y: number;
  w: number;
  h: number;
  used: boolean;
  right?: PackNode;
  down?: PackNode;
};

class BinPacker {
  root: PackNode;
  constructor(w: number, h: number) {
    this.root = { x: 0, y: 0, w, h, used: false };
  }
  insert(w: number, h: number): PackNode | null {
    return this.insertNode(this.root, w, h);
  }
  insertNode(node: PackNode, w: number, h: number): PackNode | null {
    if (node.used) {
      const rightNode = this.insertNode(node.right!, w, h);
      if (rightNode) return rightNode;
      return this.insertNode(node.down!, w, h);
    } else if (w <= node.w && h <= node.h) {
      node.used = true;
      node.down = { x: node.x, y: node.y + h, w: node.w, h: node.h - h, used: false };
      node.right = { x: node.x + w, y: node.y, w: node.w - w, h: h, used: false };
      return node;
    }
    return null;
  }
}

export interface PackResult {
  spritesheets: { name: string; canvas: HTMLCanvasElement; transparentCanvas?: HTMLCanvasElement; transparentName?: string; previewUrl?: string; transparentPreviewUrl?: string }[];
  standalones: { name: string; canvas: HTMLCanvasElement; transparentCanvas?: HTMLCanvasElement; transparentName?: string; previewUrl?: string; transparentPreviewUrl?: string }[];
  jsons: { filename: string; data: any }[];
  stats: {
    totalImages: number;
    groups: Record<string, number>;
  };
}

export async function packZip(
  zipFile: File,
  baseName: string = 'atlas',
  bgColor: 'transparent' | 'black' | 'both' = 'both',
  maxSize: number = 1024
): Promise<PackResult> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);

  const entries = Object.entries(loadedZip.files).filter(([path, file]) => !file.dir);
  const loadedImages: ({ name: string; img: HTMLImageElement } | null)[] = [];

  // Read images in batches to prevent UI freezing
  const BATCH_SIZE = 50;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async ([path, file]) => {
      const ext = path.split('.').pop()?.toLowerCase();
      if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) return null;

      const blob = await file.async('blob');
      const url = URL.createObjectURL(blob);
      
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });

      return { name: path.split('/').pop() || path, img };
    });

    const results = await Promise.all(batchPromises);
    loadedImages.push(...results);
    
    // Yield to main thread
    await new Promise(r => setTimeout(r, 0));
  }

  const images = loadedImages.filter((item): item is {name: string; img: HTMLImageElement} => item !== null);

  // Group by dimension
  const groups: Record<string, typeof images> = {};
  for (const item of images) {
    const key = `${item.img.width}x${item.img.height}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  const jsons: { filename: string, data: any }[] = [];
  
  const createAtlasJson = (sheetName: string, w: number, h: number) => {
    return {
      "atlas_name": sheetName.replace(/\.[^/.]+$/, ""),
      "atlas_prefab_guid": "dfff0bb914e66084dbf5d706d473da62",
      "atlas_source_png": `Resources/prefabs/atlas/${sheetName}`,
      "atlas_source_png_abs": `F:\\Game\\Unity\\Mu1Full\\Projects\\muvn8-6000-AssetRipper\\Assets\\Resources\\prefabs\\atlas\\${sheetName}`,
      "atlas_width": w,
      "atlas_height": h,
      "atlas_mode": "RGBA",
      "mCoordinates": 0,
      "mPixelSize": 1,
      "material_path": `Resources/prefabs/atlas/${sheetName.replace(/\.[^/.]+$/, ".mat")}`,
      "sprite_count": 0,
      "sprites": [] as any[]
    };
  };

  const addSpriteToJson = (json: any, name: string, x: number, y: number, w: number, h: number) => {
    json.sprites.push({
      "name": name.replace(/\.[^/.]+$/, ""),
      "outer": { "x": x, "y": y, "width": w, "height": h },
      "inner": { "x": x, "y": y, "width": w, "height": h },
      "paddingLeft": 0,
      "paddingRight": 0,
      "paddingTop": 0,
      "paddingBottom": 0,
      "rotated": 0,
      "png": name.includes('/') ? name : `sprites/${name}`
    });
    json.sprite_count++;
  };

  const spritesheets: { name: string; canvas: HTMLCanvasElement; jsonFilename: string; jsonData: any; transparentCanvas?: HTMLCanvasElement; transparentName?: string }[] = [];
  const standalones: { name: string; canvas: HTMLCanvasElement; jsonFilename: string; jsonData: any; transparentCanvas?: HTMLCanvasElement; transparentName?: string }[] = [];
  const mixedPile: typeof images = [];
  let sheetIndex = 0;

  const MAX_SIZE = maxSize;

  const initCanvas = (w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    
    let transparentCanvas: HTMLCanvasElement | undefined;
    let transparentCtx: CanvasRenderingContext2D | undefined;

    if (bgColor === 'black' || bgColor === 'both') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
    }
    
    if (bgColor === 'both') {
      transparentCanvas = document.createElement('canvas');
      transparentCanvas.width = w; transparentCanvas.height = h;
      transparentCtx = transparentCanvas.getContext('2d')!;
    }
    
    return { canvas, ctx, transparentCanvas, transparentCtx };
  };

  const getStName = (originalName: string) => {
    if (bgColor === 'transparent' || bgColor === 'black') {
      return { name: originalName, transparentName: undefined };
    }
    // For 'both'
    const parts = originalName.split('.');
    const ext = parts.pop();
    const base = parts.join('.');
    return { 
      name: `${base}_noback.${ext}`, 
      transparentName: originalName 
    };
  };

  for (const [dim, items] of Object.entries(groups)) {
    if (items.length === 0) continue;
    
    // Yield to main thread to prevent UI freeze
    await new Promise(r => setTimeout(r, 0));
    
    const w = items[0].img.width;
    const h = items[0].img.height;

    // Condition 1: Exceeds MAX_SIZE -> keep standalone
    if (w > MAX_SIZE || h > MAX_SIZE) {
      for (const item of items) {
        const { canvas, ctx, transparentCanvas, transparentCtx } = initCanvas(w, h);
        ctx.drawImage(item.img, 0, 0);
        if (transparentCtx) transparentCtx.drawImage(item.img, 0, 0);
        const { name, transparentName } = getStName(item.name);
        
        const jsonFilename = name.replace(/\.[^/.]+$/, ".json");
        const jsonData = createAtlasJson(name, w, h);
        addSpriteToJson(jsonData, item.name, 0, 0, w, h);
        jsons.push({ filename: jsonFilename, data: jsonData });
        
        standalones.push({ name, canvas, jsonFilename, jsonData, transparentCanvas, transparentName });
      }
      continue;
    }

    const cols = Math.floor(MAX_SIZE / w);
    const rows = Math.floor(MAX_SIZE / h);
    const itemsPerSheet = cols * rows;

    const fullSheetsCount = Math.floor(items.length / itemsPerSheet);
    const leftoverCount = items.length % itemsPerSheet;

    // Pack full sheets
    for (let s = 0; s < fullSheetsCount; s++) {
      const chunk = items.slice(s * itemsPerSheet, (s + 1) * itemsPerSheet);
      
      const normalName = `${baseName}_${sheetIndex}.png`;
      const sheetName = bgColor === 'both' ? `${baseName}_${sheetIndex}_noback.png` : normalName;
      const transparentName = bgColor === 'both' ? normalName : undefined;
      sheetIndex++;

      const { canvas, ctx, transparentCanvas, transparentCtx } = initCanvas(MAX_SIZE, MAX_SIZE);
      
      const jsonFilename = sheetName.replace(/\.[^/.]+$/, ".json");
      const jsonData = createAtlasJson(sheetName, MAX_SIZE, MAX_SIZE);

      chunk.forEach((item, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * w;
        const y = row * h;

        ctx.drawImage(item.img, x, y);
        if (transparentCtx) transparentCtx.drawImage(item.img, x, y);

        addSpriteToJson(jsonData, item.name, x, y, w, h);
      });

      jsons.push({ filename: jsonFilename, data: jsonData });
      spritesheets.push({ name: sheetName, canvas, jsonFilename, jsonData, transparentCanvas, transparentName });
    }

    // Leftovers go to mixed pile
    if (leftoverCount > 0) {
      mixedPile.push(...items.slice(fullSheetsCount * itemsPerSheet));
    }
  }

  // Pack mixedPile into combined atlases
  if (mixedPile.length > 0) {
    mixedPile.sort((a, b) => b.img.height - a.img.height); // sort for better packing

    let currentMixedPacker = new BinPacker(MAX_SIZE, MAX_SIZE);
    let { canvas: currentMixedCanvas, ctx: currentMixedCtx, transparentCanvas: currentMixedTransCanvas, transparentCtx: currentMixedTransCtx } = initCanvas(MAX_SIZE, MAX_SIZE);
    let currentMixedItems = 0;
    
    let currentNormalName = `${baseName}_${sheetIndex}.png`;
    let currentSheetName = bgColor === 'both' ? `${baseName}_${sheetIndex}_noback.png` : currentNormalName;
    let currentTransparentName = bgColor === 'both' ? currentNormalName : undefined;
    let currentJsonFilename = currentSheetName.replace(/\.[^/.]+$/, ".json");
    let currentJsonData = createAtlasJson(currentSheetName, MAX_SIZE, MAX_SIZE);

    for (let i = 0; i < mixedPile.length; i++) {
      const item = mixedPile[i];
      if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));

      const w = item.img.width;
      const h = item.img.height;
      let node = currentMixedPacker.insert(w, h);
      
      if (!node) {
        // Current sheet full, save it
        if (currentMixedItems > 0) {
          jsons.push({ filename: currentJsonFilename, data: currentJsonData });
          spritesheets.push({ name: currentSheetName, canvas: currentMixedCanvas, jsonFilename: currentJsonFilename, jsonData: currentJsonData, transparentCanvas: currentMixedTransCanvas, transparentName: currentTransparentName });
          sheetIndex++;
        }
        
        // Start new sheet
        currentMixedPacker = new BinPacker(MAX_SIZE, MAX_SIZE);
        const nextInit = initCanvas(MAX_SIZE, MAX_SIZE);
        currentMixedCanvas = nextInit.canvas;
        currentMixedCtx = nextInit.ctx;
        currentMixedTransCanvas = nextInit.transparentCanvas;
        currentMixedTransCtx = nextInit.transparentCtx;
        currentMixedItems = 0;
        
        currentNormalName = `${baseName}_${sheetIndex}.png`;
        currentSheetName = bgColor === 'both' ? `${baseName}_${sheetIndex}_noback.png` : currentNormalName;
        currentTransparentName = bgColor === 'both' ? currentNormalName : undefined;
        currentJsonFilename = currentSheetName.replace(/\.[^/.]+$/, ".json");
        currentJsonData = createAtlasJson(currentSheetName, MAX_SIZE, MAX_SIZE);
        
        node = currentMixedPacker.insert(w, h);
      }
      
      if (node) {
        currentMixedCtx.drawImage(item.img, node.x, node.y);
        if (currentMixedTransCtx) currentMixedTransCtx.drawImage(item.img, node.x, node.y);
        
        addSpriteToJson(currentJsonData, item.name, node.x, node.y, w, h);
        currentMixedItems++;
      } else {
        // If it STILL doesn't fit (shouldn't happen since w,h <= MAX_SIZE), fallback to standalone
        const { canvas: stCanvas, ctx: stCtx, transparentCanvas: stTransCanvas, transparentCtx: stTransCtx } = initCanvas(w, h);
        stCtx.drawImage(item.img, 0, 0);
        if (stTransCtx) stTransCtx.drawImage(item.img, 0, 0);
        const { name, transparentName } = getStName(item.name);
        
        const stJsonFilename = name.replace(/\.[^/.]+$/, ".json");
        const stJsonData = createAtlasJson(name, w, h);
        addSpriteToJson(stJsonData, item.name, 0, 0, w, h);
        jsons.push({ filename: stJsonFilename, data: stJsonData });
        
        standalones.push({ name, canvas: stCanvas, jsonFilename: stJsonFilename, jsonData: stJsonData, transparentCanvas: stTransCanvas, transparentName });
      }
    }

    if (currentMixedItems > 0) {
      jsons.push({ filename: currentJsonFilename, data: currentJsonData });
      spritesheets.push({ name: currentSheetName, canvas: currentMixedCanvas, jsonFilename: currentJsonFilename, jsonData: currentJsonData, transparentCanvas: currentMixedTransCanvas, transparentName: currentTransparentName });
      sheetIndex++;
    }
  }

  const stats = {
    totalImages: images.length,
    groups: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]))
  };

  // Generate preview URLs concurrently to avoid UI thread blocking
  await Promise.all([
    ...spritesheets.map(async sheet => {
      const blob = await new Promise<Blob | null>(r => sheet.canvas.toBlob(r, 'image/png'));
      if (blob) sheet.previewUrl = URL.createObjectURL(blob);
      if (sheet.transparentCanvas) {
        const tBlob = await new Promise<Blob | null>(r => sheet.transparentCanvas!.toBlob(r, 'image/png'));
        if (tBlob) sheet.transparentPreviewUrl = URL.createObjectURL(tBlob);
      }
    }),
    ...standalones.map(async item => {
      const blob = await new Promise<Blob | null>(r => item.canvas.toBlob(r, 'image/png'));
      if (blob) item.previewUrl = URL.createObjectURL(blob);
      if (item.transparentCanvas) {
        const tBlob = await new Promise<Blob | null>(r => item.transparentCanvas!.toBlob(r, 'image/png'));
        if (tBlob) item.transparentPreviewUrl = URL.createObjectURL(tBlob);
      }
    })
  ]);

  return { spritesheets, standalones, jsons, stats };
}

export async function downloadPackResult(result: PackResult, baseName: string = 'atlas') {
  const zip = new JSZip();

  // Add JSON files
  for (const json of result.jsons) {
    zip.file(json.filename, JSON.stringify(json.data, null, 2));
  }

  // Add atlas sheets
  for (const sheet of result.spritesheets) {
    const blob = await new Promise<Blob | null>(resolve => {
      sheet.canvas.toBlob(resolve, 'image/png');
    });
    const hasBoth = !!sheet.transparentName;
    if (blob) {
      zip.file(hasBoth ? `black_bg/${sheet.name}` : sheet.name, blob);
    }
    
    if (sheet.transparentCanvas && sheet.transparentName) {
      const transBlob = await new Promise<Blob | null>(resolve => {
        sheet.transparentCanvas!.toBlob(resolve, 'image/png');
      });
      if (transBlob) {
        zip.file(`noback/${sheet.transparentName}`, transBlob);
      }
    }
  }

  // Add standalones
  for (const standalone of result.standalones) {
    const blob = await new Promise<Blob | null>(resolve => {
      standalone.canvas.toBlob(resolve, 'image/png');
    });
    const hasBoth = !!standalone.transparentName;
    if (blob) {
      zip.file(hasBoth ? `black_bg/${standalone.name}` : standalone.name, blob);
    }
    
    if (standalone.transparentCanvas && standalone.transparentName) {
      const transBlob = await new Promise<Blob | null>(resolve => {
        standalone.transparentCanvas!.toBlob(resolve, 'image/png');
      });
      if (transBlob) {
        zip.file(`noback/${standalone.transparentName}`, transBlob);
      }
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  
  // Download
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

import { useState } from 'react';
import { Upload, Package, Download, Info, FileJson, Image as ImageIcon, Settings, X, ZoomIn } from 'lucide-react';
import { packImages, PackResult, downloadPackResult } from '../lib/packer';

export default function Packer() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [autoProcess, setAutoProcess] = useState(true);
  const [baseName, setBaseName] = useState('atlas');
  const [bgColor, setBgColor] = useState<'transparent' | 'black' | 'both'>('both');
  const [maxSize, setMaxSize] = useState(512);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (newFiles: File[]) => {
    let validFiles = newFiles.filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.zip') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp') || name.endsWith('.gif');
    });

    if (validFiles.length === 0) {
      setError('Please upload a .zip file or image files (max 500)');
      return;
    }

    // Only allow max 500 image files
    if (validFiles.length > 500) {
      setError('You can only upload a maximum of 500 images at once.');
      validFiles = validFiles.slice(0, 500);
    }

    setFiles(validFiles);
    setResult(null);
    setError(null);
    
    if (autoProcess) {
      await processFiles(validFiles, baseName, bgColor, maxSize);
    }
  };

  const processFiles = async (fs: File[], name: string, bg: 'transparent' | 'black' | 'both', size: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await packImages(fs, name, bg, size);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to process files');
    } finally {
      setLoading(false);
    }
  };

  const handleManualProcess = () => {
    if (files.length > 0) {
      processFiles(files, baseName, bgColor, maxSize);
    }
  };

  const handleDownloadBundle = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    
    // Download normal image
    if (item.previewUrl && item.name) {
      const aImg = document.createElement('a');
      aImg.href = item.previewUrl;
      aImg.download = item.name;
      document.body.appendChild(aImg);
      aImg.click();
      document.body.removeChild(aImg);
    }

    // Download transparent image if exists
    if (item.transparentPreviewUrl && item.transparentName) {
      const aTrans = document.createElement('a');
      aTrans.href = item.transparentPreviewUrl;
      aTrans.download = item.transparentName;
      document.body.appendChild(aTrans);
      aTrans.click();
      document.body.removeChild(aTrans);
    }
    
    // Download json if exists
    if (item.jsonData && item.jsonFilename) {
      const jsonStr = JSON.stringify(item.jsonData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const aJson = document.createElement('a');
      aJson.href = url;
      aJson.download = item.jsonFilename;
      document.body.appendChild(aJson);
      aJson.click();
      document.body.removeChild(aJson);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Upload ZIP or Multiple Images (Max 500)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Output Base Name</label>
            <input 
              type="text" 
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              placeholder="e.g. my_sprites"
            />
            <p className="text-xs text-gray-500 mt-1">Generates {baseName}.json, {baseName}_0.png, inside {baseName}.zip</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Atlas Background</label>
            <select
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value as 'transparent' | 'black' | 'both')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-white"
            >
              <option value="both">Both (Transparent & Black)</option>
              <option value="transparent">Transparent Only</option>
              <option value="black">Black Only (Best for additive blending/glows)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">If both, outputs transparent images and black-background images with _noback.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Atlas Size</label>
            <select
              value={maxSize}
              onChange={(e) => setMaxSize(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-white"
            >
              <option value={512}>512x512</option>
              <option value={1024}>1024x1024</option>
              <option value={2048}>2048x2048</option>
              <option value={4096}>4096x4096</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Maximum width and height of each spritesheet.</p>
          </div>
        </div>
        
        <div className="flex items-center mb-6 px-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoProcess}
              onChange={(e) => setAutoProcess(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Auto-process on upload</span>
          </label>
        </div>

        <div className="flex items-center justify-center w-full">
          <label 
            htmlFor="dropzone-file" 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
              <Upload className={`w-10 h-10 mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-500">.zip or image files (png, jpg, etc.)</p>
            </div>
            <input id="dropzone-file" type="file" multiple className="hidden" accept=".zip,image/png,image/jpeg,image/webp,image/gif" onChange={handleFileChange} />
          </label>
        </div>
        
        {files.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-between">
            <span className="font-medium truncate">
              {files.length === 1 ? files[0].name : `${files.length} files selected`}
            </span>
            {!autoProcess && (
              <button 
                onClick={handleManualProcess} 
                disabled={loading}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {loading ? <Package className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                {loading ? 'Processing...' : 'Pack Images'}
              </button>
            )}
            {autoProcess && loading && (
              <div className="ml-4 flex items-center gap-2 text-blue-600 font-medium text-sm">
                <Package className="w-4 h-4 animate-spin" /> Processing...
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            Error: {error}
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Info className="w-5 h-5 text-green-600" />
              Processing Complete
            </h2>
            <button 
              onClick={() => downloadPackResult(result, baseName)}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download Packed ZIP
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Statistics</h3>
              <p className="text-3xl font-bold text-gray-800 mb-1">{result.stats.totalImages}</p>
              <p className="text-sm text-gray-500">Total valid images processed</p>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Grouped by size:</p>
                <ul className="space-y-1">
                  {Object.entries(result.stats.groups).map(([dim, count]) => (
                    <li key={dim} className="text-sm flex justify-between">
                      <span className="font-mono text-gray-500">{dim}</span>
                      <span className="font-medium text-gray-700">{count} imgs</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Generated Assets</h3>
              <div className="flex gap-4">
                <div>
                  <p className="text-3xl font-bold text-gray-800 mb-1">{result.spritesheets.length}</p>
                  <p className="text-sm text-gray-500 mb-4">1024x1024 Atlases</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-800 mb-1">{result.standalones?.length || 0}</p>
                  <p className="text-sm text-gray-500 mb-4">Standalone Images</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Includes {baseName}_X.json files for each atlas with positions
              </div>
              {(bgColor === 'black' || bgColor === 'both') && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Includes transparent versions alongside _noback files
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 space-y-6 pt-6 border-t border-gray-100">
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-600" />
                Generated JSON Preview
              </h3>
              <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-60">
                {result.jsons && result.jsons.length > 0 
                  ? JSON.stringify(result.jsons[0].data, null, 2) 
                  : "No JSON generated"}
              </pre>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-600" />
                Generated Images Preview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {result.spritesheets.flatMap((sheet, idx) => {
                  const items = [];
                  items.push(
                    <div key={`sheet-${idx}`} className="space-y-2 group relative">
                      <p className="text-xs font-medium text-gray-500">{sheet.name} (Atlas)</p>
                      <div 
                        className="relative cursor-pointer overflow-hidden rounded bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgfQMgDxWAJMA5hYDAA2Yd0g/7/Z8D/k3g0g9EABgNIMxAAcWoA8QAAVdIEGf/Q1JkAAAAASUVORK5CYII=')] shadow-sm border border-gray-200"
                        onClick={() => setPreviewImage(sheet.previewUrl || '')}
                      >
                        <img 
                          src={sheet.previewUrl} 
                          alt={sheet.name}
                          className="w-full h-auto transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors" title="Zoom">
                            <ZoomIn className="text-white w-6 h-6" />
                          </button>
                          <button 
                            className="p-2 bg-blue-600/80 hover:bg-blue-600 rounded-full transition-colors" 
                            title="Download All Files (JSON, Image, Transparent)"
                            onClick={(e) => handleDownloadBundle(e, sheet)}
                          >
                            <Download className="text-white w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                  if (sheet.transparentCanvas && sheet.transparentName) {
                    items.push(
                      <div key={`sheet-trans-${idx}`} className="space-y-2 group relative">
                        <p className="text-xs font-medium text-gray-500">{sheet.transparentName} (Transparent)</p>
                        <div 
                          className="relative cursor-pointer overflow-hidden rounded bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgfQMgDxWAJMA5hYDAA2Yd0g/7/Z8D/k3g0g9EABgNIMxAAcWoA8QAAVdIEGf/Q1JkAAAAASUVORK5CYII=')] shadow-sm border border-gray-200"
                          onClick={() => setPreviewImage(sheet.transparentPreviewUrl || '')}
                        >
                          <img 
                            src={sheet.transparentPreviewUrl} 
                            alt={sheet.transparentName}
                            className="w-full h-auto transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors" title="Zoom">
                              <ZoomIn className="text-white w-6 h-6" />
                            </button>
                            <button 
                              className="p-2 bg-blue-600/80 hover:bg-blue-600 rounded-full transition-colors" 
                              title="Download All Files (JSON, Image, Transparent)"
                              onClick={(e) => handleDownloadBundle(e, sheet)}
                            >
                              <Download className="text-white w-6 h-6" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return items;
                })}
                {result.standalones?.flatMap((item, idx) => {
                  const items = [];
                  items.push(
                    <div key={`alone-${idx}`} className="space-y-2 group relative">
                      <p className="text-xs font-medium text-gray-500">{item.name} (Standalone)</p>
                      <div 
                        className="relative cursor-pointer overflow-hidden rounded bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgfQMgDxWAJMA5hYDAA2Yd0g/7/Z8D/k3g0g9EABgNIMxAAcWoA8QAAVdIEGf/Q1JkAAAAASUVORK5CYII=')] shadow-sm border border-gray-200"
                        onClick={() => setPreviewImage(item.previewUrl || '')}
                      >
                        <img 
                          src={item.previewUrl} 
                          alt={item.name}
                          className="w-full h-auto transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors" title="Zoom">
                            <ZoomIn className="text-white w-6 h-6" />
                          </button>
                          <button 
                            className="p-2 bg-blue-600/80 hover:bg-blue-600 rounded-full transition-colors" 
                            title="Download All Files (JSON, Image, Transparent)"
                            onClick={(e) => handleDownloadBundle(e, item)}
                          >
                            <Download className="text-white w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                  if (item.transparentCanvas && item.transparentName) {
                    items.push(
                      <div key={`alone-trans-${idx}`} className="space-y-2 group relative">
                        <p className="text-xs font-medium text-gray-500">{item.transparentName} (Transparent)</p>
                        <div 
                          className="relative cursor-pointer overflow-hidden rounded bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgfQMgDxWAJMA5hYDAA2Yd0g/7/Z8D/k3g0g9EABgNIMxAAcWoA8QAAVdIEGf/Q1JkAAAAASUVORK5CYII=')] shadow-sm border border-gray-200"
                          onClick={() => setPreviewImage(item.transparentPreviewUrl || '')}
                        >
                          <img 
                            src={item.transparentPreviewUrl} 
                            alt={item.transparentName}
                            className="w-full h-auto transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors" title="Zoom">
                              <ZoomIn className="text-white w-6 h-6" />
                            </button>
                            <button 
                              className="p-2 bg-blue-600/80 hover:bg-blue-600 rounded-full transition-colors" 
                              title="Download All Files (JSON, Image, Transparent)"
                              onClick={(e) => handleDownloadBundle(e, item)}
                            >
                              <Download className="text-white w-6 h-6" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return items;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
            onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={previewImage} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}

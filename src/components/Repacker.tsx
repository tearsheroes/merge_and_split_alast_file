import { useState } from 'react';
import { Upload, FileJson, Image as ImageIcon, Download, Scissors, AlertCircle, ZoomIn } from 'lucide-react';
import { repackAtlas, RepackResult } from '../lib/repacker';

export default function Repacker() {
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepackResult | null>(null);

  const [isDraggingJson, setIsDraggingJson] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);

  const handleJsonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setJsonFile(e.target.files[0]);
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const processRepack = async () => {
    if (!jsonFile || imageFiles.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await repackAtlas(jsonFile, imageFiles);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to repack files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.previewUrl;
    a.download = result.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">Repack Images</h2>
      <p className="text-sm text-gray-500 mb-6">Upload 1 JSON file and multiple small images to repack them into a large spritesheet based on the JSON coordinates. Missing images will be drawn as white boxes with a red X.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FileJson className="w-4 h-4" /> 1. Upload JSON
          </label>
          <div className="flex items-center justify-center w-full">
            <label 
              onDragOver={(e) => { e.preventDefault(); setIsDraggingJson(true); }}
              onDragLeave={() => setIsDraggingJson(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingJson(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const file = e.dataTransfer.files[0];
                  if (file.name.toLowerCase().endsWith('.json')) {
                    setJsonFile(file);
                  }
                }
              }}
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                isDraggingJson ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50 hover:border-blue-400'
              }`}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4 pointer-events-none">
                {jsonFile ? (
                  <span className="font-medium text-blue-600 truncate max-w-[200px]">{jsonFile.name}</span>
                ) : (
                  <>
                    <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span></p>
                    <p className="text-xs text-gray-400">1 .json file</p>
                  </>
                )}
              </div>
              <input type="file" className="hidden" accept=".json" onChange={handleJsonChange} />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> 2. Upload Small Images
          </label>
          <div className="flex items-center justify-center w-full">
            <label 
              onDragOver={(e) => { e.preventDefault(); setIsDraggingImages(true); }}
              onDragLeave={() => setIsDraggingImages(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingImages(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  setImageFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                }
              }}
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                isDraggingImages ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50 hover:border-blue-400'
              }`}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4 pointer-events-none">
                {imageFiles.length > 0 ? (
                  <span className="font-medium text-blue-600 truncate max-w-[200px]">
                    {imageFiles.length === 1 ? imageFiles[0].name : `${imageFiles.length} files selected`}
                  </span>
                ) : (
                  <>
                    <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span></p>
                    <p className="text-xs text-gray-400">Multiple .png, .jpg files or 1 .zip file</p>
                  </>
                )}
              </div>
              <input type="file" className="hidden" accept=".zip,image/png,image/jpeg,image/webp" multiple onChange={handleImagesChange} />
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-start gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button 
          onClick={processRepack} 
          disabled={loading || !jsonFile || imageFiles.length === 0}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-sm"
        >
          {loading ? <ImageIcon className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          {loading ? 'Repacking...' : 'Repack to Spritesheet'}
        </button>
      </div>

      {result && (
        <div className="mt-8 border-t border-gray-100 pt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Repacked Image Preview</h3>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              Download Result
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex flex-col items-center">
              <div className="relative group max-w-full overflow-hidden rounded-lg shadow-sm border border-gray-200 bg-white">
                <div className="absolute inset-0 bg-checkered opacity-20 pointer-events-none"></div>
                <img 
                  src={result.previewUrl} 
                  alt={result.name}
                  className="max-w-full h-auto max-h-[600px] object-contain relative z-10"
                />
              </div>
              <p className="text-sm text-gray-500 mt-3 font-medium">{result.name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

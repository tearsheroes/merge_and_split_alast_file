import { useState } from 'react';
import { Upload, FileJson, Image as ImageIcon, Download, Scissors } from 'lucide-react';
import { unpackAtlas } from '../lib/unpacker';

export default function Unpacker() {
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [sheetFiles, setSheetFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingJson, setIsDraggingJson] = useState(false);
  const [isDraggingSheets, setIsDraggingSheets] = useState(false);

  const handleJsonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setJsonFile(e.target.files[0]);
    }
  };

  const handleSheetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSheetFiles(Array.from(e.target.files));
    }
  };

  const processUnpack = async () => {
    if (!jsonFile || sheetFiles.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await unpackAtlas(jsonFile, sheetFiles);
    } catch (err: any) {
      setError(err.message || 'Failed to unpack files');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">Unpack Spritesheets</h2>
      <p className="text-sm text-gray-500 mb-6">Upload the JSON and all corresponding sprite sheet images to extract the original images.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FileJson className="w-4 h-4" /> 1. Upload atlas.json
          </label>
          <div className="flex items-center justify-center w-full">
            <label 
              onDragOver={(e) => { e.preventDefault(); setIsDraggingJson(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDraggingJson(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingJson(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const f = e.dataTransfer.files[0];
                  if (f.name.endsWith('.json')) setJsonFile(f);
                }
              }}
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                isDraggingJson ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4 pointer-events-none">
                {jsonFile ? (
                  <span className="font-medium text-blue-600 truncate max-w-[200px]">{jsonFile.name}</span>
                ) : (
                  <>
                    <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag</p>
                    <p className="text-xs text-gray-400 mt-1">.json only</p>
                  </>
                )}
              </div>
              <input type="file" className="hidden" accept=".json" onChange={handleJsonChange} />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> 2. Upload Sprite Sheets
          </label>
          <div className="flex items-center justify-center w-full">
            <label 
              onDragOver={(e) => { e.preventDefault(); setIsDraggingSheets(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDraggingSheets(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingSheets(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                  if (files.length > 0) {
                    setSheetFiles(prev => [...prev, ...files]);
                  }
                }
              }}
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                isDraggingSheets ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4 pointer-events-none">
                {sheetFiles.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <span className="font-medium text-purple-600 truncate max-w-[200px]">{sheetFiles.length} images selected</span>
                    <button 
                      onClick={(e) => { e.preventDefault(); setSheetFiles([]); }} 
                      className="text-xs text-gray-400 hover:text-red-500 mt-1 cursor-pointer pointer-events-auto"
                    >
                      Clear selection
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag</p>
                    <p className="text-xs text-gray-400 mt-1">Select all generated .png sheets</p>
                  </>
                )}
              </div>
              <input type="file" className="hidden" accept="image/png" multiple onChange={handleSheetsChange} />
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
          Error: {error}
        </div>
      )}

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button 
          onClick={processUnpack} 
          disabled={loading || !jsonFile || sheetFiles.length === 0}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-sm"
        >
          {loading ? <Scissors className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
          {loading ? 'Unpacking...' : 'Unpack and Download ZIP'}
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Package, Scissors, Image as ImageIcon } from 'lucide-react';
import Packer from './components/Packer';
import Unpacker from './components/Unpacker';
import Repacker from './components/Repacker';
import PerformanceMonitor from './components/PerformanceMonitor';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pack' | 'unpack' | 'repack'>('pack');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl mb-4 shadow-sm text-white">
            <Package className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">Sprite Atlas Maker</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Locally pack your image collections into 1024x1024 spritesheets, or unpack them back to individual files. No data leaves your browser.
          </p>
        </header>

        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 inline-flex">
            <button
              onClick={() => setActiveTab('pack')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'pack' 
                  ? 'bg-blue-50 text-blue-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Package className="w-4 h-4" />
              Pack Images
            </button>
            <button
              onClick={() => setActiveTab('unpack')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'unpack' 
                  ? 'bg-blue-50 text-blue-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Scissors className="w-4 h-4" />
              Unpack Spritesheets
            </button>
            <button
              onClick={() => setActiveTab('repack')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'repack' 
                  ? 'bg-blue-50 text-blue-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Repack Images
            </button>
          </div>
        </div>

        <main className="transition-all duration-300">
          {activeTab === 'pack' && <Packer />}
          {activeTab === 'unpack' && <Unpacker />}
          {activeTab === 'repack' && <Repacker />}
        </main>
      </div>
      <PerformanceMonitor />
    </div>
  );
}

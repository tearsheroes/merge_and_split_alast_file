import React, { useState, useEffect } from 'react';

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    fps: 0,
    cpuLoad: 0,
    memoryUsed: 0,
    memoryTotal: 0,
    memoryPercent: 0,
    ramTotal: 0,
  });

  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let rafId: number;
    let timeoutId: number;

    const measure = () => {
      const now = performance.now();
      frames++;

      if (now >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (now - lastTime));
        frames = 0;
        lastTime = now;
        
        let memUsed = 0;
        let memTotal = 0;
        let memPercent = 0;

        const perfMemory = (performance as any).memory;
        if (perfMemory) {
          memUsed = perfMemory.usedJSHeapSize / (1024 * 1024);
          memTotal = perfMemory.jsHeapSizeLimit / (1024 * 1024);
          memPercent = (perfMemory.usedJSHeapSize / perfMemory.jsHeapSizeLimit) * 100;
        }

        const ramTotal = (navigator as any).deviceMemory || 0; // GB

        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsed: memUsed,
          memoryTotal: memTotal,
          memoryPercent: memPercent,
          ramTotal,
        }));
      }

      rafId = requestAnimationFrame(measure);
    };

    rafId = requestAnimationFrame(measure);

    // Event loop lag for CPU load estimation
    let lastLagTime = performance.now();
    const checkLag = () => {
      const now = performance.now();
      const delta = now - lastLagTime;
      const lag = Math.max(0, delta - 100); // We expect it to run every 100ms
      // If lag is high, CPU is busy. Assuming 100ms lag = 100% CPU load spike
      const estimatedLoad = Math.min(100, Math.round((lag / 100) * 100));
      
      setMetrics(prev => ({
        ...prev,
        cpuLoad: estimatedLoad > 0 ? estimatedLoad : (60 - prev.fps) > 0 ? Math.min(100, Math.round(((60 - prev.fps) / 60) * 100)) : 0
      }));
      
      lastLagTime = performance.now();
      timeoutId = window.setTimeout(checkLag, 100);
    };
    timeoutId = window.setTimeout(checkLag, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900/90 text-green-400 p-3 rounded-lg font-mono text-xs z-50 backdrop-blur-md border border-gray-800 shadow-2xl pointer-events-none w-48">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
        <span className="font-semibold text-white">Performance</span>
        <div className={`w-2 h-2 rounded-full ${metrics.cpuLoad > 80 ? 'bg-red-500' : metrics.cpuLoad > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} />
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-gray-400">CPU Load:</span>
            <span>{metrics.cpuLoad}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${metrics.cpuLoad > 80 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${metrics.cpuLoad}%` }}></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-gray-400">Memory/Heap:</span>
            <span>{metrics.memoryPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${metrics.memoryPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${metrics.memoryPercent}%` }}></div>
          </div>
          <div className="text-[10px] text-gray-500 mt-1 text-right">
            {metrics.memoryUsed.toFixed(0)} / {metrics.memoryTotal.toFixed(0)} MB
          </div>
        </div>
        
        <div className="flex justify-between mt-1 text-[10px] text-gray-500">
          <span>Sys RAM: {metrics.ramTotal ? `${metrics.ramTotal}GB+` : 'N/A'}</span>
          <span>{metrics.fps} FPS</span>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { 
  Download, 
  Sparkles
} from 'lucide-react';

interface HeaderProps {
    filename: string;
    hasImage: boolean;
    displayImage: string | null;
}

export const Header: React.FC<HeaderProps> = ({ filename, hasImage, displayImage }) => {
  const handleDownload = () => {
    if (!displayImage) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'edited-image.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.95);
    };
    img.onerror = () => {
      console.error('Failed to load image for download');
    };
    img.src = displayImage;
  };

  return (
    <header className="h-14 bg-[#18181b] border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 z-20">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-600 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
          <Sparkles size={18} strokeWidth={2.5} />
        </div>
        <span className="font-bold text-gray-100 text-lg tracking-tight">MARIO<span className="text-fuchsia-500"> AI</span></span>
      </div>

      {/* Center: Filename */}
      <div className="flex items-center gap-4">
        <div className="hidden lg:block text-sm font-medium text-gray-400">
          {hasImage ? filename : "Chưa chọn ảnh"}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button 
          onClick={handleDownload}
          disabled={!hasImage || !displayImage} 
          className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 shadow-lg transition-all ${hasImage && displayImage ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-fuchsia-500/20' : 'bg-zinc-800 text-zinc-600 shadow-none cursor-not-allowed'}`}
        >
          <Download size={16} />
          Tải xuống
        </button>
      </div>
    </header>
  );
};
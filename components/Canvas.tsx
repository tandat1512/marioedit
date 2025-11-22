import React, { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, Undo2, Redo2, ImagePlus, SplitSquareHorizontal, Trash2, MousePointer2 } from 'lucide-react';
import { TextLayer, TabType, TransformValues, CropData } from '../types';

interface CanvasProps {
    image: string | null;
    compareImage?: string | null;
    comparisonLabel?: string;
    intermediateImage?: string | null;
    onUpload: (file: File) => void;
    onClear: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    resetViewTrigger: number;
    textLayers?: TextLayer[];
    activeTextId?: string | null;
    onTextClick?: (id: string | null) => void;
    onTextUpdate?: (id: string, updates: Partial<TextLayer>) => void;
    onTextRemove?: (id: string) => void;
    // Manual Acne Interaction
    isManualAcneMode?: boolean;
    onCanvasClick?: (x: number, y: number) => void;
    transformValues?: TransformValues;
    onTransformChange?: (values: TransformValues) => void;
    activeTab?: TabType;
}

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ComponentType<any>;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon: Icon, className, ...props }) => (
    <button 
        className={`p-2.5 rounded-lg transition-colors ${props.disabled ? 'text-zinc-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-zinc-700/50'} ${className || ''}`}
        {...props}
    >
        <Icon size={20} strokeWidth={1.5} />
    </button>
);

const Divider = () => <div className="w-px h-6 bg-zinc-700 mx-1"></div>;

// Crop Overlay Component
interface CropOverlayProps {
    crop: CropData;
    imageRect: DOMRect;
    aspectRatio: string;
}

const CropOverlay: React.FC<CropOverlayProps> = ({ crop, imageRect, aspectRatio }) => {
    // Calculate crop position relative to image
    const cropX = (crop.x / 100) * imageRect.width;
    const cropY = (crop.y / 100) * imageRect.height;
    const cropW = (crop.width / 100) * imageRect.width;
    const cropH = (crop.height / 100) * imageRect.height;
    
    // Calculate absolute positions in viewport
    const absLeft = imageRect.left;
    const absTop = imageRect.top;
    
    const handleSize = 14;
    const handleStyle = "fixed bg-white border-2 border-fuchsia-500 rounded-full z-50 hover:scale-110 hover:shadow-lg";
    
    return (
        <>
            {/* Dimmed background outside crop area - 4 rectangles around crop */}
            <div className="fixed pointer-events-none z-40" style={{ left: absLeft, top: absTop, width: imageRect.width, height: imageRect.height }}>
                {/* Top dimmed area */}
                <div 
                    className="absolute bg-black/60"
                    style={{
                        left: 0,
                        top: 0,
                        width: imageRect.width,
                        height: cropY
                    }}
                />
                {/* Bottom dimmed area */}
                <div 
                    className="absolute bg-black/60"
                    style={{
                        left: 0,
                        top: cropY + cropH,
                        width: imageRect.width,
                        height: imageRect.height - (cropY + cropH)
                    }}
                />
                {/* Left dimmed area */}
                <div 
                    className="absolute bg-black/60"
                    style={{
                        left: 0,
                        top: cropY,
                        width: cropX,
                        height: cropH
                    }}
                />
                {/* Right dimmed area */}
                <div 
                    className="absolute bg-black/60"
                    style={{
                        left: cropX + cropW,
                        top: cropY,
                        width: imageRect.width - (cropX + cropW),
                        height: cropH
                    }}
                />
            </div>
            
            {/* Crop border with dashed style */}
            <div
                className="fixed border-2 border-white z-50 pointer-events-none"
                style={{
                    left: `${absLeft + cropX}px`,
                    top: `${absTop + cropY}px`,
                    width: `${cropW}px`,
                    height: `${cropH}px`,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.3) inset, 0 0 20px rgba(217,70,239,0.2)'
                }}
            >
                {/* Grid lines (Rule of thirds) */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/3 left-0 right-0 border-t border-white/40 border-dashed"></div>
                    <div className="absolute top-2/3 left-0 right-0 border-t border-white/40 border-dashed"></div>
                    <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/40 border-dashed"></div>
                    <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/40 border-dashed"></div>
                </div>
            </div>
            
            {/* Resize handles with larger hit areas */}
            {/* Corner handles */}
            <div 
                className={handleStyle} 
                style={{ 
                    left: `${absLeft + cropX - handleSize/2}px`, 
                    top: `${absTop + cropY - handleSize/2}px`, 
                    width: `${handleSize}px`, 
                    height: `${handleSize}px`, 
                    cursor: 'nwse-resize',
                    pointerEvents: 'auto'
                }} 
            />
            <div 
                className={handleStyle} 
                style={{ 
                    left: `${absLeft + cropX + cropW - handleSize/2}px`, 
                    top: `${absTop + cropY - handleSize/2}px`, 
                    width: `${handleSize}px`, 
                    height: `${handleSize}px`, 
                    cursor: 'nesw-resize',
                    pointerEvents: 'auto'
                }} 
            />
            <div 
                className={handleStyle} 
                style={{ 
                    left: `${absLeft + cropX - handleSize/2}px`, 
                    top: `${absTop + cropY + cropH - handleSize/2}px`, 
                    width: `${handleSize}px`, 
                    height: `${handleSize}px`, 
                    cursor: 'nesw-resize',
                    pointerEvents: 'auto'
                }} 
            />
            <div 
                className={handleStyle} 
                style={{ 
                    left: `${absLeft + cropX + cropW - handleSize/2}px`, 
                    top: `${absTop + cropY + cropH - handleSize/2}px`, 
                    width: `${handleSize}px`, 
                    height: `${handleSize}px`, 
                    cursor: 'nwse-resize',
                    pointerEvents: 'auto'
                }} 
            />
            
            {/* Edge handles */}
            <div 
                className={handleStyle} 
                style={{ 
                    left: `${absLeft + cropX + cropW/2 - handleSize/2}px`, 
                    top: `${absTop + cropY - handleSize/2}px`, 
                    width: `${handleSize}px`, 
                    height: `${handleSize}px`, 
                    cursor: 'ns-resize',
                    pointerEvents: 'auto'
                }} 
            />
            <div 
                className={handleStyle} 
                style={{ 
                    left: `${absLeft + cropX + cropW/2 - handleSize/2}px`, 
                    top: `${absTop + cropY + cropH - handleSize/2}px`, 
                    width: `${handleSize}px`, 
                    height: `${handleSize}px`, 
                    cursor: 'ns-resize',
                    pointerEvents: 'auto'
                }} 
            />
            <div 
                className={handleStyle} 
                style={{ 
                    left: `${absLeft + cropX - handleSize/2}px`, 
                    top: `${absTop + cropY + cropH/2 - handleSize/2}px`, 
                    width: `${handleSize}px`, 
                    height: `${handleSize}px`, 
                    cursor: 'ew-resize',
                    pointerEvents: 'auto'
                }} 
            />
            <div 
                className={handleStyle} 
                style={{ 
                    left: `${absLeft + cropX + cropW - handleSize/2}px`, 
                    top: `${absTop + cropY + cropH/2 - handleSize/2}px`, 
                    width: `${handleSize}px`, 
                    height: `${handleSize}px`, 
                    cursor: 'ew-resize',
                    pointerEvents: 'auto'
                }} 
            />
        </>
    );
};

export const Canvas: React.FC<CanvasProps> = ({ 
    image, compareImage, comparisonLabel = 'Bản gốc', intermediateImage, onUpload, onClear, onUndo, onRedo, canUndo, canRedo, resetViewTrigger,
    textLayers = [], activeTextId, onTextClick, onTextUpdate, onTextRemove,
    isManualAcneMode = false, onCanvasClick,
    transformValues, onTransformChange, activeTab
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const previousImageRef = useRef<string | null>(null);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Text Dragging State
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [textDragStart, setTextDragStart] = useState({ x: 0, y: 0 }); // Mouse position
  const [initialTextPos, setInitialTextPos] = useState({ x: 0, y: 0 }); // % position

  // Compare State
  const [isComparing, setIsComparing] = useState(false);

  // Crop State
  const [cropDragState, setCropDragState] = useState<{
    isDragging: boolean;
    dragType: 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-w' | 'resize-e' | null;
    startX: number;
    startY: number;
    startCrop: CropData;
  } | null>(null);
  
  // Track actual image dimensions for crop overlay
  const [imageDisplayRect, setImageDisplayRect] = useState<DOMRect | null>(null);

  // Reset view when resetViewTrigger changes (new upload)
  useEffect(() => {
      if (resetViewTrigger) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
  }, [resetViewTrigger]);

  // Update image display rect for crop overlay
  useEffect(() => {
    if (activeTab !== TabType.CROP) {
          setImageDisplayRect(null);
          return;
      }
      
      const updateRect = () => {
          if (imageRef.current) {
              const rect = imageRef.current.getBoundingClientRect();
              setImageDisplayRect(rect);
          }
      };
      
      // Update immediately when scale/position changes
      updateRect();
      
      window.addEventListener('resize', updateRect);
      window.addEventListener('scroll', updateRect, true);
      
      // Update very frequently to catch pan/zoom changes (every frame)
      const interval = setInterval(updateRect, 16); // ~60fps
      
      return () => {
          window.removeEventListener('resize', updateRect);
          window.removeEventListener('scroll', updateRect, true);
          clearInterval(interval);
      };
  }, [activeTab, scale, position, image, intermediateImage]);

  // Track if we've initialized crop for current tab entry
  const cropInitializedRef = useRef<boolean>(false);
  const lastActiveTabRef = useRef<TabType | undefined>(activeTab);
  const lastAspectRatioRef = useRef<string | undefined>(transformValues?.aspectRatio);

  // Auto-initialize crop when entering CROP tab
  useEffect(() => {
      // Reset initialization flag when tab changes
      if (lastActiveTabRef.current !== activeTab) {
          cropInitializedRef.current = false;
          lastActiveTabRef.current = activeTab;
      }

      // Only initialize if entering CROP tab and crop hasn't been initialized yet
      if (activeTab === TabType.CROP && transformValues && onTransformChange && !cropInitializedRef.current) {
          // Only initialize if no crop exists
          if (!transformValues.crop) {
              // Initialize default crop based on aspect ratio
              const aspectRatio = transformValues.aspectRatio || 'original';
              if (aspectRatio !== 'original' && aspectRatio !== 'free') {
                  const parts = aspectRatio.split(':');
                  if (parts.length === 2) {
                      const targetRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
                      if (!isNaN(targetRatio) && targetRatio > 0) {
                          let cropW = 80;
                          let cropH = cropW / targetRatio;
                          if (cropH > 80) {
                              cropH = 80;
                              cropW = cropH * targetRatio;
                          }
                          const defaultCrop = { x: (100 - cropW) / 2, y: (100 - cropH) / 2, width: cropW, height: cropH };
                          onTransformChange({ ...transformValues, crop: defaultCrop });
                          cropInitializedRef.current = true;
                          lastAspectRatioRef.current = aspectRatio;
                      }
                  }
              } else {
                  // Default square crop
                  const defaultCrop = { x: 10, y: 10, width: 80, height: 80 };
                  onTransformChange({ ...transformValues, crop: defaultCrop });
                  cropInitializedRef.current = true;
                  lastAspectRatioRef.current = aspectRatio;
    }
          } else {
              // Crop already exists, mark as initialized
              cropInitializedRef.current = true;
              lastAspectRatioRef.current = transformValues.aspectRatio;
          }
      }
      
      // If aspect ratio changes while in CROP tab and crop exists, update crop to match new ratio
      if (activeTab === TabType.CROP && transformValues && onTransformChange && 
          transformValues.crop && transformValues.aspectRatio !== lastAspectRatioRef.current &&
          transformValues.aspectRatio && transformValues.aspectRatio !== 'original' && transformValues.aspectRatio !== 'free') {
          const parts = transformValues.aspectRatio.split(':');
          if (parts.length === 2) {
              const targetRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
              if (!isNaN(targetRatio) && targetRatio > 0) {
                  // Update crop to match new aspect ratio while keeping center position
                  const currentCrop = transformValues.crop;
                  const centerX = currentCrop.x + currentCrop.width / 2;
                  const centerY = currentCrop.y + currentCrop.height / 2;
                  
                  let cropW = currentCrop.width;
                  let cropH = cropW / targetRatio;
                  if (cropH > 100 - currentCrop.y) {
                      cropH = 100 - currentCrop.y;
                      cropW = cropH * targetRatio;
                  }
                  if (cropW > 100 - currentCrop.x) {
                      cropW = 100 - currentCrop.x;
                      cropH = cropW / targetRatio;
                  }
                  
                  const newCrop = {
                      x: Math.max(0, Math.min(centerX - cropW / 2, 100 - cropW)),
                      y: Math.max(0, Math.min(centerY - cropH / 2, 100 - cropH)),
                      width: cropW,
                      height: cropH
                  };
                  onTransformChange({ ...transformValues, crop: newCrop });
                  lastAspectRatioRef.current = transformValues.aspectRatio;
              }
          }
      }
  }, [activeTab, transformValues?.aspectRatio, transformValues?.crop, onTransformChange]);

  // Track image changes
  useEffect(() => {
    if (image && image !== previousImageRef.current) {
      previousImageRef.current = image;
    } else if (!image) {
      previousImageRef.current = null;
    }
  }, [image]);

  
  // --- File Upload Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        onUpload(file);
    }
    // Critical: Reset input value so same file can be selected again
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
          onUpload(file);
      }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  // --- Zoom & Pan Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
      if (!image) return;
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(0.1, scale + delta), 5);
      setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!image) return;
      
      // If in Manual Acne Mode, we handle the click in MouseUp to distinguish from drag
      if (isManualAcneMode) return;

      // Handle Crop interaction when in CROP tab
      if (activeTab === TabType.CROP && imageRef.current && transformValues && onTransformChange) {
        const rect = imageRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
        
          // Get current crop or initialize default crop based on aspect ratio
          let currentCrop = transformValues.crop;
          if (!currentCrop) {
              // Initialize default crop based on aspect ratio
              if (transformValues.aspectRatio && transformValues.aspectRatio !== 'original' && transformValues.aspectRatio !== 'free') {
                  const parts = transformValues.aspectRatio.split(':');
                  if (parts.length === 2) {
                      const targetRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
                      if (!isNaN(targetRatio) && targetRatio > 0) {
                          let cropW = 80;
                          let cropH = cropW / targetRatio;
                          if (cropH > 80) {
                              cropH = 80;
                              cropW = cropH * targetRatio;
                          }
                          currentCrop = { x: (100 - cropW) / 2, y: (100 - cropH) / 2, width: cropW, height: cropH };
                      }
                  }
              } else {
                  currentCrop = { x: 10, y: 10, width: 80, height: 80 };
              }
              // Set the crop if it was just initialized
              onTransformChange({ ...transformValues, crop: currentCrop });
          }
          
          // Calculate crop bounds in pixels
          const cropX = (currentCrop.x / 100) * rect.width;
          const cropY = (currentCrop.y / 100) * rect.height;
          const cropW = (currentCrop.width / 100) * rect.width;
          const cropH = (currentCrop.height / 100) * rect.height;
          
          const handleSize = 12;
          const margin = 8;
          
          // Check if clicking on resize handles
          const isNW = mouseX >= cropX - margin && mouseX <= cropX + handleSize && mouseY >= cropY - margin && mouseY <= cropY + handleSize;
          const isNE = mouseX >= cropX + cropW - handleSize && mouseX <= cropX + cropW + margin && mouseY >= cropY - margin && mouseY <= cropY + handleSize;
          const isSW = mouseX >= cropX - margin && mouseX <= cropX + handleSize && mouseY >= cropY + cropH - handleSize && mouseY <= cropY + cropH + margin;
          const isSE = mouseX >= cropX + cropW - handleSize && mouseX <= cropX + cropW + margin && mouseY >= cropY + cropH - handleSize && mouseY <= cropY + cropH + margin;
          const isN = mouseX >= cropX + handleSize && mouseX <= cropX + cropW - handleSize && mouseY >= cropY - margin && mouseY <= cropY + handleSize;
          const isS = mouseX >= cropX + handleSize && mouseX <= cropX + cropW - handleSize && mouseY >= cropY + cropH - handleSize && mouseY <= cropY + cropH + margin;
          const isW = mouseX >= cropX - margin && mouseX <= cropX + handleSize && mouseY >= cropY + handleSize && mouseY <= cropY + cropH - handleSize;
          const isE = mouseX >= cropX + cropW - handleSize && mouseX <= cropX + cropW + margin && mouseY >= cropY + handleSize && mouseY <= cropY + cropH - handleSize;
          
          // Check if clicking inside crop area (for move)
          const isInside = mouseX >= cropX && mouseX <= cropX + cropW && mouseY >= cropY && mouseY <= cropY + cropH;
          
          if (isNW || isNE || isSW || isSE || isN || isS || isW || isE || isInside) {
              e.preventDefault();
              e.stopPropagation();
              
              let dragType: 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-w' | 'resize-e' | null = null;
              if (isNW) dragType = 'resize-nw';
              else if (isNE) dragType = 'resize-ne';
              else if (isSW) dragType = 'resize-sw';
              else if (isSE) dragType = 'resize-se';
              else if (isN) dragType = 'resize-n';
              else if (isS) dragType = 'resize-s';
              else if (isW) dragType = 'resize-w';
              else if (isE) dragType = 'resize-e';
              else if (isInside) dragType = 'move';
              
              setCropDragState({
                  isDragging: true,
                  dragType,
                  startX: mouseX,
                  startY: mouseY,
                  startCrop: { ...currentCrop }
              });
            return;
          }
      }

      e.preventDefault();

      // Handle Pan / Deselect
      if (onTextClick) onTextClick(null); 
      setIsPanning(true);
      setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      // Handle Crop Drag
      if (cropDragState && cropDragState.isDragging && imageRef.current && transformValues && onTransformChange) {
          e.preventDefault();
          e.stopPropagation();
          
          const rect = imageRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          const deltaX = mouseX - cropDragState.startX;
          const deltaY = mouseY - cropDragState.startY;
          const deltaPercentX = (deltaX / rect.width) * 100;
          const deltaPercentY = (deltaY / rect.height) * 100;
          
          let newCrop: CropData = { ...cropDragState.startCrop };
          
          if (cropDragState.dragType === 'move') {
              newCrop.x = Math.max(0, Math.min(100 - newCrop.width, cropDragState.startCrop.x + deltaPercentX));
              newCrop.y = Math.max(0, Math.min(100 - newCrop.height, cropDragState.startCrop.y + deltaPercentY));
          } else if (cropDragState.dragType === 'resize-nw') {
              newCrop.x = Math.max(0, Math.min(cropDragState.startCrop.x + cropDragState.startCrop.width - 10, cropDragState.startCrop.x + deltaPercentX));
              newCrop.y = Math.max(0, Math.min(cropDragState.startCrop.y + cropDragState.startCrop.height - 10, cropDragState.startCrop.y + deltaPercentY));
              newCrop.width = cropDragState.startCrop.width - (newCrop.x - cropDragState.startCrop.x);
              newCrop.height = cropDragState.startCrop.height - (newCrop.y - cropDragState.startCrop.y);
          } else if (cropDragState.dragType === 'resize-ne') {
              newCrop.y = Math.max(0, Math.min(cropDragState.startCrop.y + cropDragState.startCrop.height - 10, cropDragState.startCrop.y + deltaPercentY));
              newCrop.width = Math.max(10, Math.min(100 - cropDragState.startCrop.x, cropDragState.startCrop.width + deltaPercentX));
              newCrop.height = cropDragState.startCrop.height - (newCrop.y - cropDragState.startCrop.y);
          } else if (cropDragState.dragType === 'resize-sw') {
              newCrop.x = Math.max(0, Math.min(cropDragState.startCrop.x + cropDragState.startCrop.width - 10, cropDragState.startCrop.x + deltaPercentX));
              newCrop.width = cropDragState.startCrop.width - (newCrop.x - cropDragState.startCrop.x);
              newCrop.height = Math.max(10, Math.min(100 - cropDragState.startCrop.y, cropDragState.startCrop.height + deltaPercentY));
          } else if (cropDragState.dragType === 'resize-se') {
              newCrop.width = Math.max(10, Math.min(100 - cropDragState.startCrop.x, cropDragState.startCrop.width + deltaPercentX));
              newCrop.height = Math.max(10, Math.min(100 - cropDragState.startCrop.y, cropDragState.startCrop.height + deltaPercentY));
          } else if (cropDragState.dragType === 'resize-n') {
              newCrop.y = Math.max(0, Math.min(cropDragState.startCrop.y + cropDragState.startCrop.height - 10, cropDragState.startCrop.y + deltaPercentY));
              newCrop.height = cropDragState.startCrop.height - (newCrop.y - cropDragState.startCrop.y);
          } else if (cropDragState.dragType === 'resize-s') {
              newCrop.height = Math.max(10, Math.min(100 - cropDragState.startCrop.y, cropDragState.startCrop.height + deltaPercentY));
          } else if (cropDragState.dragType === 'resize-w') {
              newCrop.x = Math.max(0, Math.min(cropDragState.startCrop.x + cropDragState.startCrop.width - 10, cropDragState.startCrop.x + deltaPercentX));
              newCrop.width = cropDragState.startCrop.width - (newCrop.x - cropDragState.startCrop.x);
          } else if (cropDragState.dragType === 'resize-e') {
              newCrop.width = Math.max(10, Math.min(100 - cropDragState.startCrop.x, cropDragState.startCrop.width + deltaPercentX));
          }
          
          // Apply aspect ratio constraint if needed
          if (transformValues.aspectRatio && transformValues.aspectRatio !== 'original' && transformValues.aspectRatio !== 'free') {
              const parts = transformValues.aspectRatio.split(':');
              if (parts.length === 2) {
                  const targetRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
                  if (!isNaN(targetRatio) && targetRatio > 0) {
                      const currentRatio = newCrop.width / newCrop.height;
                      if (currentRatio > targetRatio) {
                          newCrop.width = newCrop.height * targetRatio;
          } else {
                          newCrop.height = newCrop.width / targetRatio;
                }
              }
            }
          }
          
          onTransformChange({ ...transformValues, crop: newCrop });
          return;
      }

      // Handle Text Drag
      if (draggingTextId && imageRef.current && onTextUpdate) {
          e.preventDefault();
          const imgRect = imageRef.current.getBoundingClientRect();
          const deltaX = e.clientX - textDragStart.x;
          const deltaY = e.clientY - textDragStart.y;
          const deltaPercentX = (deltaX / imgRect.width) * 100;
          const deltaPercentY = (deltaY / imgRect.height) * 100;
          const newX = Math.min(100, Math.max(0, initialTextPos.x + deltaPercentX));
          const newY = Math.min(100, Math.max(0, initialTextPos.y + deltaPercentY));
          onTextUpdate(draggingTextId, { x: newX, y: newY });
          return;
      }

      // Handle Pan
      if (isPanning) {
          e.preventDefault();
          setPosition({
              x: e.clientX - panStart.x,
              y: e.clientY - panStart.y
          });
      }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      setIsPanning(false);
      setDraggingTextId(null);
      setCropDragState(null);

      // Handle Click for Manual Acne
      if (isManualAcneMode && onCanvasClick && imageRef.current && !isPanning) {
          const rect = imageRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          // Check bounds
          if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
             const percentX = (x / rect.width) * 100;
             const percentY = (y / rect.height) * 100;
             onCanvasClick(percentX, percentY);
          }
      }
  };

  // Text Layer Handlers
  const handleTextMouseDown = (e: React.MouseEvent, text: TextLayer) => {
      if (isManualAcneMode) return; // Disable text selection while healing
      e.stopPropagation(); 
      if (onTextClick) onTextClick(text.id);
      setDraggingTextId(text.id);
      setTextDragStart({ x: e.clientX, y: e.clientY });
      setInitialTextPos({ x: text.x, y: text.y });
  };

  // Toolbar Actions
  const zoomIn = () => setScale(s => Math.min(s + 0.25, 5));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.1));
  const fitScreen = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  // Determine which image to show
  // When in CROP tab, show intermediateImage (before crop) so user can see full image with crop overlay
  const baseImage = activeTab === TabType.CROP && intermediateImage ? intermediateImage : image;
  const displayImage = isComparing && compareImage ? compareImage : baseImage;

  return (
    <main 
        className={`flex-1 bg-[#09090b] relative overflow-hidden flex items-center justify-center p-0 select-none ${isManualAcneMode ? 'cursor-crosshair' : 'cursor-default'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <input 
         type="file" 
         ref={fileInputRef} 
         onChange={handleFileChange} 
         accept="image/*" 
         className="hidden" 
      />

      {!image ? (
          // Upload State
          <div 
            onClick={triggerUpload}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full max-w-2xl h-[400px] border-2 border-dashed rounded-3xl transition-all cursor-pointer group mx-8 z-10
                ${isDraggingFile 
                    ? 'border-fuchsia-500 bg-fuchsia-500/10' 
                    : 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-600'
                }`}
          >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform shadow-xl ${isDraggingFile ? 'bg-fuchsia-500 text-white scale-110' : 'bg-zinc-800 text-gray-400 group-hover:scale-110 group-hover:text-fuchsia-500'}`}>
                  <ImagePlus size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-200 mb-2">Mở hình ảnh</h3>
              <p className="text-sm text-gray-500">Kéo thả hoặc nhấn để chọn file</p>
          </div>
      ) : (
          // Image State
          <>
              <div 
                className="w-full h-full flex items-center justify-center canvas-bg"
                style={{ 
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: isPanning || draggingTextId ? 'none' : 'transform 0.1s ease-out'
                }}
              >
                   <div className="relative inline-block shadow-2xl image-wrapper">
                       <img 
                        ref={imageRef}
                        src={displayImage || undefined}
                        alt="Editing preview"
                        className="max-w-none border border-zinc-800/50 pointer-events-none block"
                        style={{ maxHeight: 'none', maxWidth: 'none' }}
                       />
                       
                       {/* Manual Acne Cursor Overlay (Visual Guide) */}
                       {isManualAcneMode && (
                           <div className="absolute inset-0 pointer-events-none z-50 bg-transparent">
                               {/* Optionally show circles where user clicked */}
                           </div>
                       )}

                       {/* Text Layers Overlay */}
                       {!isComparing && textLayers.map(text => (
                           <div
                                key={text.id}
                                onMouseDown={(e) => handleTextMouseDown(e, text)}
                                className={`absolute cursor-move px-2 py-1 border border-transparent hover:border-fuchsia-500/50 transition-colors group ${activeTextId === text.id ? 'border-fuchsia-500 ring-1 ring-fuchsia-500 bg-black/10 z-50' : 'z-40'}`}
                                style={{
                                    left: `${text.x}%`,
                                    top: `${text.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                    fontSize: `${text.fontSize}px`,
                                    fontFamily: text.fontFamily,
                                    color: text.color,
                                    fontWeight: text.isBold ? 'bold' : 'normal',
                                    fontStyle: text.isItalic ? 'italic' : 'normal',
                                    textDecoration: text.isUnderline ? 'underline' : 'none',
                                    lineHeight: text.lineHeight,
                                    letterSpacing: `${text.letterSpacing}px`,
                                    textAlign: text.align,
                                    opacity: text.opacity / 100,
                                    whiteSpace: 'pre-wrap',
                                    width: 'max-content',
                                    maxWidth: '100%',
                                }}
                           >
                               {text.text}
                               {activeTextId === text.id && (
                                    <button
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            onTextRemove?.(text.id);
                                        }}
                                        className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center shadow-md border border-white hover:bg-red-600 transition-colors"
                                        title="Xóa"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                               )}
                           </div>
                       ))}
                   </div>
              </div>
              
              {/* Crop Overlay - Positioned absolutely outside transform div */}
              {activeTab === TabType.CROP && transformValues?.crop && imageDisplayRect && imageDisplayRect.width > 0 && imageDisplayRect.height > 0 && (
                  <CropOverlay
                      crop={transformValues.crop}
                      imageRect={imageDisplayRect}
                      aspectRatio={transformValues.aspectRatio}
                  />
              )}
              
              {/* Floating Toolbar */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#18181b] border border-zinc-800 shadow-2xl rounded-2xl px-3 py-1.5 flex items-center gap-1 z-30 animate-in fade-in slide-in-from-bottom-4" onMouseDown={e => e.stopPropagation()}>
                    <ToolbarButton icon={ZoomOut} onClick={zoomOut} title="Thu nhỏ" />
                    <span className="text-xs font-mono text-gray-400 w-12 text-center select-none">{Math.round(scale * 100)}%</span>
                    <ToolbarButton icon={ZoomIn} onClick={zoomIn} title="Phóng to" />
                    <Divider />
                    <ToolbarButton icon={Undo2} onClick={onUndo} disabled={!canUndo} title="Hoàn tác (Undo)" />
                    <ToolbarButton icon={Redo2} onClick={onRedo} disabled={!canRedo} title="Làm lại (Redo)" />
                    <Divider />
                    <ToolbarButton 
                        icon={SplitSquareHorizontal} 
                        onMouseDown={() => setIsComparing(true)}
                        onMouseUp={() => setIsComparing(false)}
                                        onMouseLeave={() => setIsComparing(false)}
                                        onTouchStart={() => setIsComparing(true)}
                                        onTouchEnd={() => setIsComparing(false)}
                                        disabled={!compareImage}
                        title="Nhấn giữ để so sánh (Hold to compare)"
                        className={isComparing ? "bg-zinc-700 text-white" : ""}
                    />
                    <ToolbarButton icon={Maximize} onClick={fitScreen} title="Vừa màn hình" />
              </div>
              
              {/* Compare Indicator */}
              {isComparing && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium pointer-events-none animate-in fade-in duration-200 border border-white/10">
                      {comparisonLabel}
                  </div>
              )}

              {isManualAcneMode && (
                   <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-fuchsia-600/90 backdrop-blur text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg pointer-events-none animate-in fade-in flex items-center gap-2">
                       <MousePointer2 size={16} />
                       Chạm vào mụn để xóa
                   </div>
              )}
          </>
      )}
      
      {/* Grid Overlay for Reference (Optional, subtle) */}
      {image && <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] -z-0"></div>}
    </main>
  );
};
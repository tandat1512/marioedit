import React from 'react';
import { 
    SlidersHorizontal, 
    Sparkles, 
    Aperture, 
    Wand2, 
    Trash2,
    Crop,
    Type,
    Cpu
} from 'lucide-react';
import { TabType } from '../types';

interface LeftSidebarProps {
    activeTab: TabType;
    onSelect: (tab: TabType) => void;
    hasImage: boolean;
    onRemove: () => void;
}

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const NavItem = ({ icon: Icon, label, isActive, onClick }: NavItemProps) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-[62px] h-[62px] rounded-2xl mb-3 transition-all duration-300 group relative select-none
            ${isActive 
                ? 'bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-purple-900/40 translate-y-0' 
                : 'bg-transparent text-gray-500 hover:text-gray-200 hover:bg-zinc-800/30'
            }`}
    >
        <Icon 
            size={22} 
            strokeWidth={isActive ? 2 : 1.5} 
            className={`mb-1.5 transition-all duration-300 ${isActive ? 'scale-100' : 'group-hover:scale-110'}`} 
        />
        <span className={`text-[9px] font-semibold tracking-wide transition-all duration-300 ${isActive ? 'text-white/90' : 'text-gray-500 group-hover:text-gray-300'}`}>
            {label}
        </span>
    </button>
);

export function LeftSidebar({ activeTab, onSelect, hasImage, onRemove }: LeftSidebarProps) {
    return (
        <aside className="w-[90px] bg-[#09090b] border-r border-zinc-900 flex flex-col items-center py-6 shrink-0 z-30 h-full select-none overflow-y-auto custom-scrollbar">
            {/* Navigation Items */}
            <div className="flex flex-col w-full items-center space-y-1 pb-4">
                <NavItem 
                    icon={SlidersHorizontal} 
                    label="Cơ bản" 
                    isActive={activeTab === TabType.BASIC} 
                    onClick={() => onSelect(TabType.BASIC)} 
                />
                <NavItem 
                    icon={Crop} 
                    label="Cắt" 
                    isActive={activeTab === TabType.CROP} 
                    onClick={() => onSelect(TabType.CROP)} 
                />
                <NavItem 
                    icon={Type} 
                    label="Văn bản" 
                    isActive={activeTab === TabType.TEXT} 
                    onClick={() => onSelect(TabType.TEXT)} 
                />
                <NavItem 
                    icon={Sparkles} 
                    label="Làm đẹp" 
                    isActive={activeTab === TabType.BEAUTY} 
                    onClick={() => onSelect(TabType.BEAUTY)} 
                />
                <NavItem 
                    icon={Aperture} 
                    label="Bộ lọc" 
                    isActive={activeTab === TabType.FILTER} 
                    onClick={() => onSelect(TabType.FILTER)} 
                />
                <NavItem 
                    icon={Wand2} 
                    label="Hiệu ứng" 
                    isActive={activeTab === TabType.EFFECT} 
                    onClick={() => onSelect(TabType.EFFECT)} 
                />
                <NavItem 
                    icon={Cpu} 
                    label="AI Pro" 
                    isActive={activeTab === TabType.AI_PRO} 
                    onClick={() => onSelect(TabType.AI_PRO)} 
                />
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto mb-2 pt-4 border-t border-zinc-900 w-full flex justify-center">
                <button 
                    onClick={onRemove}
                    disabled={!hasImage}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
                        ${hasImage 
                            ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-900/30 hover:scale-105 hover:rotate-12' 
                            : 'bg-zinc-800/50 text-zinc-700 cursor-not-allowed'}`}
                    title={hasImage ? "Xóa ảnh hiện tại" : "Chưa có ảnh"}
                >
                    <Trash2 size={20} strokeWidth={2} />
                </button>
            </div>
        </aside>
    );
}
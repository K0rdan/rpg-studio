'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import PreviewModal from '@/components/PreviewModal';
import type { GameProject, Map, Tileset } from '@packages/types';

interface PreviewData {
  project: GameProject;
  maps: Map[];
  tilesets: Tileset[];
}

interface PreviewContextType {
  play: (data: PreviewData) => void;
}

const PreviewContext = createContext<PreviewContextType | undefined>(undefined);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const play = (data: PreviewData) => {
    setPreviewData(data);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setPreviewData(null);
  };

  return (
    <PreviewContext.Provider value={{ play }}>
      {children}
      {isOpen && previewData && (
        <PreviewModal 
          isOpen={isOpen} 
          onClose={close} 
          data={previewData} 
        />
      )}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const context = useContext(PreviewContext);
  if (context === undefined) {
    throw new Error('usePreview must be used within a PreviewProvider');
  }
  return context;
}

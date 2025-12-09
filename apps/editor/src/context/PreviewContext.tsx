'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import PreviewModal from '@/components/PreviewModal';

interface PreviewContextType {
  play: (projectId: string) => Promise<void>;
}

const PreviewContext = createContext<PreviewContextType | undefined>(undefined);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ project: any; maps: any[] } | null>(null);

  const play = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/preview`);
      if (!res.ok) throw new Error('Failed to load preview data');
      const data = await res.json();
      // Ensure data is plain JSON (remove any MongoDB wrappers if they leaked)
      const sanitizedData = JSON.parse(JSON.stringify(data));
      setPreviewData(sanitizedData);
      setIsOpen(true);
    } catch (err) {
      console.error(err);
      // TODO: Show toast error
    } finally {
      setLoading(false);
    }
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

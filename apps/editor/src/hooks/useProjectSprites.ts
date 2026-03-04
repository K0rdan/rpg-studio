'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Sprite } from '@packages/types';

export function useProjectSprites(projectId: string | null) {
  const [sprites, setSprites] = useState<Sprite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSprites = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/sprites`);
      if (!res.ok) throw new Error(`Failed to load sprites: ${res.statusText}`);
      const data: Sprite[] = await res.json();
      setSprites(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSprites();
  }, [fetchSprites]);

  const uploadSprite = async (
    file: File,
    name: string,
    options?: { frame_width?: number; frame_height?: number; animations?: Record<string, number[]> }
  ): Promise<Sprite> => {
    if (!projectId) throw new Error('No projectId');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (options?.frame_width) formData.append('frame_width', String(options.frame_width));
    if (options?.frame_height) formData.append('frame_height', String(options.frame_height));
    if (options?.animations) formData.append('animations', JSON.stringify(options.animations));

    const res = await fetch(`/api/projects/${projectId}/sprites`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as any).message || 'Upload failed');
    }

    const created: Sprite = await res.json();
    await fetchSprites(); // re-fetch list
    return created;
  };

  const deleteSprite = async (spriteId: string): Promise<void> => {
    if (!projectId) throw new Error('No projectId');
    const res = await fetch(`/api/projects/${projectId}/sprites/${spriteId}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      throw new Error('Delete failed');
    }
    await fetchSprites();
  };

  return {
    sprites,
    isLoading,
    error,
    refetch: fetchSprites,
    uploadSprite,
    deleteSprite,
  };
}

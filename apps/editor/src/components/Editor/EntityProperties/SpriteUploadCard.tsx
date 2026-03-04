'use client';

import { useState, useRef } from 'react';
import { Box, Typography, Button, CircularProgress, Tooltip } from '@mui/material';
import { Upload, CheckCircle, Warning } from '@mui/icons-material';
import type { Sprite } from '@packages/types';

interface SpriteUploadCardProps {
  /** The currently attached sprite, or null if none */
  currentSprite: Sprite | null;
  /** Called with the newly uploaded sprite */
  onSpriteUploaded: (sprite: Sprite) => void;
  /** Upload function from useProjectSprites */
  onUpload: (file: File, name: string, options?: { frame_width?: number; frame_height?: number }) => Promise<Sprite>;
}

/** Reads the natural dimensions of an image File via a temporary object URL. */
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image dimensions'));
    };
    img.src = url;
  });

export const SpriteUploadCard = ({ currentSprite, onSpriteUploaded, onUpload }: SpriteUploadCardProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [detectedDims, setDetectedDims] = useState<{ fw: number; fh: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      // Detect image dimensions and derive per-frame sizes (4-col × 4-row RPG Maker grid)
      const { width, height } = await getImageDimensions(file);
      const frame_width = Math.round(width / 4);
      const frame_height = Math.round(height / 4);
      setDetectedDims({ fw: frame_width, fh: frame_height });

      const defaultName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const sprite = await onUpload(file, defaultName, { frame_width, frame_height });
      onSpriteUploaded(sprite);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Box
      sx={{
        border: '1px solid #444',
        borderRadius: 1,
        p: 1.5,
        mt: 1,
        bgcolor: '#1a1a1a',
      }}
    >
      <Typography variant="overline" sx={{ color: '#2196F3', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.1em' }}>
        Charset / Sprite
      </Typography>

      {/* Thumbnail or placeholder */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 1,
            bgcolor: '#2d2d2d',
            border: '1px solid #444',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {currentSprite?.image_source ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentSprite.image_source}
              alt={currentSprite.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
            />
          ) : (
            <Typography sx={{ fontSize: 24, lineHeight: 1 }}>🎭</Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {currentSprite ? (
            <Tooltip title={currentSprite.name}>
              <Typography variant="body2" sx={{ color: '#ddd', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentSprite.name}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" sx={{ color: '#666' }}>
              No charset attached
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: '#555', lineHeight: 1.2 }}>
            {detectedDims
              ? `PNG · ${detectedDims.fw * 4}×${detectedDims.fh * 4} px · ${detectedDims.fw}×${detectedDims.fh} per frame ✓`
              : 'PNG · any size · 4-col × 4-row grid'}
          </Typography>

          <Button
            size="small"
            startIcon={uploading ? <CircularProgress size={12} /> : <Upload fontSize="small" />}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              mt: 0.25,
              alignSelf: 'flex-start',
              color: '#2196F3',
              borderColor: '#2196F3',
              fontSize: '0.7rem',
              py: 0.25,
              px: 1,
              '&:hover': { bgcolor: 'rgba(33,150,243,0.1)' },
            }}
            variant="outlined"
          >
            {uploading ? 'Uploading…' : currentSprite ? 'Replace' : 'Upload charset'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </Box>

        {currentSprite && !uploading && !uploadError && (
          currentSprite.image_source ? (
            /* Sprite attached and URL accessible */
            <CheckCircle sx={{ color: '#4CAF50', fontSize: 18, flexShrink: 0 }} />
          ) : (
            /* Sprite in DB but URL unavailable — storage offline */
            <Tooltip title="Charset image unavailable — storage may be offline. The preview will show ⚠ instead of the character.">
              <Warning sx={{ color: '#FF8C00', fontSize: 18, flexShrink: 0 }} />
            </Tooltip>
          )
        )}

        {uploadError && (
          <Tooltip title={uploadError}>
            <Warning sx={{ color: '#ff9800', fontSize: 18, flexShrink: 0 }} />
          </Tooltip>
        )}
      </Box>

      {uploadError && (
        <Typography variant="caption" sx={{ color: '#ff9800', display: 'block', mt: 0.5 }}>
          {uploadError}
        </Typography>
      )}

      {/* Storage offline notice when no upload error but sprite URL is missing */}
      {currentSprite && !currentSprite.image_source && !uploadError && (
        <Typography variant="caption" sx={{ color: '#FF8C00', display: 'block', mt: 0.5 }}>
          ⚠ Charset registered but image storage is temporarily unreachable.
        </Typography>
      )}
    </Box>
  );
};

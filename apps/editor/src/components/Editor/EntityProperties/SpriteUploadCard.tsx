'use client';

import { useState, useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Upload, CheckCircle, Warning } from '@mui/icons-material';
import {
  CHARSET_GRID_COLUMNS,
  CHARSET_GRID_ROWS,
  MAX_CHARSET_FRAME_DIMENSION,
  MIN_CHARSET_FRAME_DIMENSION,
  isValidCharsetFrameDimension,
  type Sprite,
} from '@packages/types';

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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    try {
      const { width, height } = await getImageDimensions(file);
      setPendingFile(file);
      setImageDimensions({ width, height });
      setFrameWidth(width / CHARSET_GRID_COLUMNS);
      setFrameHeight(height / CHARSET_GRID_ROWS);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    setImageDimensions(null);
    setFrameWidth(0);
    setFrameHeight(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!pendingFile || !imageDimensions) return;

    if (
      !isValidCharsetFrameDimension(frameWidth)
      || !isValidCharsetFrameDimension(frameHeight)
    ) {
      setUploadError(
        `Frame dimensions must be whole numbers between ${MIN_CHARSET_FRAME_DIMENSION} and ${MAX_CHARSET_FRAME_DIMENSION} pixels`,
      );
      return;
    }

    if (
      imageDimensions.width !== frameWidth * CHARSET_GRID_COLUMNS
      || imageDimensions.height !== frameHeight * CHARSET_GRID_ROWS
    ) {
      setUploadError(
        `Image dimensions must match a ${CHARSET_GRID_COLUMNS}×${CHARSET_GRID_ROWS} grid of the configured frame size`,
      );
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const defaultName = pendingFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const sprite = await onUpload(pendingFile, defaultName, {
        frame_width: frameWidth,
        frame_height: frameHeight,
      });
      onSpriteUploaded(sprite);
      clearPendingFile();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
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
            {pendingFile && imageDimensions
              ? `${pendingFile.name} · ${imageDimensions.width}×${imageDimensions.height} px`
              : currentSprite
                ? `${currentSprite.frame_width}×${currentSprite.frame_height} px per frame`
                : `PNG · any frame size · ${CHARSET_GRID_COLUMNS}-col × ${CHARSET_GRID_ROWS}-row grid`}
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
            {uploading ? 'Uploading…' : pendingFile ? 'Choose another' : currentSprite ? 'Replace' : 'Choose charset'}
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

      {pendingFile && (
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Frame width"
              type="number"
              size="small"
              value={frameWidth}
              onChange={(event) => setFrameWidth(Number(event.target.value))}
              disabled={uploading}
              slotProps={{
                htmlInput: {
                  min: MIN_CHARSET_FRAME_DIMENSION,
                  max: MAX_CHARSET_FRAME_DIMENSION,
                  step: 1,
                },
              }}
              fullWidth
            />
            <TextField
              label="Frame height"
              type="number"
              size="small"
              value={frameHeight}
              onChange={(event) => setFrameHeight(Number(event.target.value))}
              disabled={uploading}
              slotProps={{
                htmlInput: {
                  min: MIN_CHARSET_FRAME_DIMENSION,
                  max: MAX_CHARSET_FRAME_DIMENSION,
                  step: 1,
                },
              }}
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" disabled={uploading} onClick={handleUpload}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            <Button size="small" disabled={uploading} onClick={clearPendingFile}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      )}

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

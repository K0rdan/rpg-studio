'use client';

import { useRef, useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import {
  CHARSET_GRID_COLUMNS,
  CHARSET_GRID_ROWS,
  MAX_CHARSET_FRAME_DIMENSION,
  MIN_CHARSET_FRAME_DIMENSION,
  isValidCharsetFrameDimension,
} from '@packages/types';
import { apiFetch } from '@/lib/apiFetch';
import { useToast } from '@/context/ToastContext';

interface CharsetUploadDialogProps {
  projectId: string;
  folderPath?: string;
  onCharsetUploaded?: () => void;
  iconOnly?: boolean;
}

async function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('Could not read image dimensions'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function CharsetUploadDialog({
  projectId,
  folderPath = '',
  onCharsetUploaded,
  iconOnly = false,
}: CharsetUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [frameWidth, setFrameWidth] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const reset = () => {
    setFile(null);
    setName('');
    setFrameWidth(0);
    setFrameHeight(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    if (loading) return;
    setOpen(false);
    reset();
  };

  const selectFile = async (selected: File | undefined) => {
    if (!selected) return;
    try {
      const dimensions = await imageDimensions(selected);
      setFile(selected);
      setName(selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      setFrameWidth(dimensions.width / CHARSET_GRID_COLUMNS);
      setFrameHeight(dimensions.height / CHARSET_GRID_ROWS);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not read image');
    }
  };

  const upload = async () => {
    if (!file || !name.trim()) {
      setError('Choose an image and enter a name');
      return;
    }
    if (!isValidCharsetFrameDimension(frameWidth) || !isValidCharsetFrameDimension(frameHeight)) {
      setError(
        `Frame dimensions must be whole numbers between ${MIN_CHARSET_FRAME_DIMENSION} and ${MAX_CHARSET_FRAME_DIMENSION}`,
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('name', name.trim());
      data.append('frame_width', String(frameWidth));
      data.append('frame_height', String(frameHeight));
      data.append('folderPath', folderPath);
      const response = await apiFetch(`/api/projects/${projectId}/sprites`, {
        method: 'POST',
        body: data,
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || 'Failed to upload charset');

      showToast(`Charset "${name.trim()}" uploaded successfully`, 'success');
      setOpen(false);
      reset();
      onCharsetUploaded?.();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Failed to upload charset';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {iconOnly ? (
        <Tooltip title={folderPath ? `Upload charset to ${folderPath}` : 'Upload charset'}>
          <IconButton
            size="small"
            aria-label="Upload charset"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
          >
            <UploadIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      ) : (
        <Button startIcon={<UploadIcon />} variant="contained" onClick={() => setOpen(true)}>
          Upload Charset
        </Button>
      )}

      <Dialog open={open} onClick={(event) => event.stopPropagation()} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle>Upload Charset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Button component="label" variant="outlined" disabled={loading}>
              {file?.name ?? 'Choose spritesheet'}
              <input
                ref={inputRef}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void selectFile(event.target.files?.[0])}
              />
            </Button>
            <TextField
              label="Charset name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={loading}
              required
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Frame width"
                type="number"
                value={frameWidth}
                onChange={(event) => setFrameWidth(Number(event.target.value))}
                disabled={loading}
                fullWidth
              />
              <TextField
                label="Frame height"
                type="number"
                value={frameHeight}
                onChange={(event) => setFrameHeight(Number(event.target.value))}
                disabled={loading}
                fullWidth
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Expected layout: {CHARSET_GRID_COLUMNS} columns × {CHARSET_GRID_ROWS} rows.
            </Typography>
            {error && <Typography color="error" variant="body2">{error}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={loading}>Cancel</Button>
          <Button
            onClick={() => void upload()}
            disabled={loading}
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <UploadIcon />}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

'use client';

import { useState } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Card,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CharsetStyle,
  CHARSET_GRID_COLUMNS,
  CHARSET_GRID_ROWS,
  DEFAULT_CHARSET_FRAME_SIZE,
  MAX_CHARSET_FRAME_DIMENSION,
  MIN_CHARSET_FRAME_DIMENSION,
  isValidCharsetFrameDimension,
  type CharsetGenerationRequest,
} from '@packages/types';
import { useToast } from '@/context/ToastContext';
import { apiFetch } from '@/lib/apiFetch';

interface CharsetGenerateDialogProps {
  projectId: string;
  onCharsetGenerated?: () => void;
  iconOnly?: boolean;
}

interface CharsetGenerationParams extends CharsetGenerationRequest {
  prompt: string;
}

interface GenerationResponse {
  preview_data: string;
  generation_params: CharsetGenerationParams;
}

export default function CharsetGenerateDialog({
  projectId,
  onCharsetGenerated,
  iconOnly = false,
}: CharsetGenerateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [frameWidth, setFrameWidth] = useState<number>(DEFAULT_CHARSET_FRAME_SIZE.width);
  const [frameHeight, setFrameHeight] = useState<number>(DEFAULT_CHARSET_FRAME_SIZE.height);
  const [style, setStyle] = useState<CharsetStyle>(CharsetStyle.FANTASY);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [generationParams, setGenerationParams] = useState<CharsetGenerationParams | null>(null);
  const { showToast } = useToast();

  const resetAndClose = () => {
    setOpen(false);
    setName('');
    setFrameWidth(DEFAULT_CHARSET_FRAME_SIZE.width);
    setFrameHeight(DEFAULT_CHARSET_FRAME_SIZE.height);
    setStyle(CharsetStyle.FANTASY);
    setCustomPrompt('');
    setPreviewData(null);
    setGenerationParams(null);
  };

  const generate = async () => {
    if (!name.trim()) {
      showToast('Please enter a charset name', 'error');
      return;
    }
    if (style === CharsetStyle.CUSTOM && !customPrompt.trim()) {
      showToast('Please describe the charset to generate', 'error');
      return;
    }
    if (
      !isValidCharsetFrameDimension(frameWidth)
      || !isValidCharsetFrameDimension(frameHeight)
    ) {
      showToast(
        `Frame dimensions must be whole numbers between ${MIN_CHARSET_FRAME_DIMENSION} and ${MAX_CHARSET_FRAME_DIMENSION} pixels`,
        'error',
      );
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch(`/api/projects/${projectId}/sprites/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          frame_width: frameWidth,
          frame_height: frameHeight,
          style,
          custom_prompt: customPrompt.trim() || undefined,
        } satisfies CharsetGenerationRequest),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to generate charset');
      }

      const generation = result as GenerationResponse;
      setPreviewData(generation.preview_data);
      setGenerationParams(generation.generation_params);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to generate charset', 'error');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!previewData || !generationParams) return;

    setLoading(true);
    try {
      const response = await apiFetch(`/api/projects/${projectId}/sprites/save-generated`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...generationParams, image_data: previewData }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save charset');
      }

      showToast(`Charset "${result.name}" saved successfully!`, 'success');
      setLoading(false);
      resetAndClose();
      onCharsetGenerated?.();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save charset', 'error');
      setLoading(false);
    }
  };

  const trigger = iconOnly ? (
    <Tooltip title="Generate charset">
      <IconButton
        size="small"
        aria-label="Generate charset"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <AutoAwesomeIcon fontSize="inherit" />
      </IconButton>
    </Tooltip>
  ) : (
    <Button startIcon={<AutoAwesomeIcon />} variant="contained" onClick={() => setOpen(true)}>
      Generate Charset
    </Button>
  );

  return (
    <>
      {trigger}
      <Dialog
        open={open}
        onClick={(event) => event.stopPropagation()}
        onClose={() => {
          if (!loading) resetAndClose();
        }}
        maxWidth={previewData ? 'md' : 'sm'}
        fullWidth
      >
        <DialogTitle>{previewData ? 'Preview Generated Charset' : 'Generate AI Charset'}</DialogTitle>
        <DialogContent>
          {previewData ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Card sx={{ bgcolor: 'grey.900' }}>
                <CardMedia
                  component="img"
                  image={previewData}
                  alt="Generated charset preview"
                  sx={{ maxHeight: 512, objectFit: 'contain', imageRendering: 'pixelated' }}
                />
              </Card>
              <Typography variant="body2" color="text.secondary">
                {generationParams?.name} · {generationParams?.frame_width}×{generationParams?.frame_height} px/frame · {CHARSET_GRID_COLUMNS}×{CHARSET_GRID_ROWS} frames
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Check that every direction is aligned to the grid before saving.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Charset Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={loading}
                required
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Frame Width"
                  type="number"
                  value={frameWidth}
                  onChange={(event) => setFrameWidth(Number(event.target.value))}
                  disabled={loading}
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
                  label="Frame Height"
                  type="number"
                  value={frameHeight}
                  onChange={(event) => setFrameHeight(Number(event.target.value))}
                  disabled={loading}
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
              <Typography variant="caption" color="text.secondary">
                Output sheet: {frameWidth * CHARSET_GRID_COLUMNS}×{frameHeight * CHARSET_GRID_ROWS} px
                {' '}({CHARSET_GRID_COLUMNS}×{CHARSET_GRID_ROWS} frames)
              </Typography>
              <FormControl fullWidth disabled={loading}>
                <InputLabel>Style Preset</InputLabel>
                <Select
                  value={style}
                  label="Style Preset"
                  onChange={(event) => setStyle(event.target.value as CharsetStyle)}
                >
                  <MenuItem value={CharsetStyle.MEDIEVAL}>Medieval</MenuItem>
                  <MenuItem value={CharsetStyle.CARTOON}>Cartoon</MenuItem>
                  <MenuItem value={CharsetStyle.FANTASY}>Fantasy</MenuItem>
                  <MenuItem value={CharsetStyle.SCI_FI}>Sci-Fi</MenuItem>
                  <MenuItem value={CharsetStyle.MODERN}>Modern</MenuItem>
                  <MenuItem value={CharsetStyle.CUSTOM}>Custom</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Character Description (Optional)"
                value={customPrompt}
                onChange={(event) => setCustomPrompt(event.target.value)}
                helperText={style === CharsetStyle.CUSTOM
                  ? 'Required for the custom preset'
                  : 'Describe outfit, hair, equipment, colors, and other details'}
                multiline
                rows={3}
                disabled={loading}
                fullWidth
              />
              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">
                    Generating the {CHARSET_GRID_COLUMNS * CHARSET_GRID_ROWS}-frame charset…
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {previewData ? (
            <>
              <Button
                startIcon={<RefreshIcon />}
                disabled={loading}
                onClick={() => {
                  setPreviewData(null);
                  setGenerationParams(null);
                }}
              >
                Regenerate
              </Button>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                disabled={loading}
                onClick={save}
              >
                {loading ? 'Saving…' : 'Save Charset'}
              </Button>
            </>
          ) : (
            <>
              <Button disabled={loading} onClick={resetAndClose}>Cancel</Button>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
                disabled={loading}
                onClick={generate}
              >
                {loading ? 'Generating…' : 'Generate'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

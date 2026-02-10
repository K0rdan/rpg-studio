'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Typography,
  CircularProgress,
  Box,
  Card,
  CardMedia,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useToast } from '@/context/ToastContext';
import { TilesetStyle, COMMON_TILE_SIZES } from '@packages/types';

interface TilesetGenerateDialogProps {
  projectId: string;
  onTilesetGenerated?: () => void;
}

export default function TilesetGenerateDialog({
  projectId,
  onTilesetGenerated,
}: TilesetGenerateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [tileWidth, setTileWidth] = useState(32);
  const [tileHeight, setTileHeight] = useState(32);
  const [style, setStyle] = useState<TilesetStyle>(TilesetStyle.FANTASY);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [generationParams, setGenerationParams] = useState<any>(null);
  const { showToast } = useToast();

  const handleGenerate = async () => {
    if (!name.trim()) {
      showToast('Please enter a tileset name', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tilesets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          tile_width: tileWidth,
          tile_height: tileHeight,
          style,
          custom_prompt: customPrompt.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate tileset');
      }

      const result = await response.json();
      
      // Show preview instead of immediately saving
      setPreviewData(result.preview_data);
      setGenerationParams(result.generation_params);
      
    } catch (error) {
      console.error('Error generating tileset:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to generate tileset',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!previewData || !generationParams) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tilesets/save-generated`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generationParams,
          image_data: previewData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save tileset');
      }

      const tileset = await response.json();
      showToast(`Tileset "${tileset.name}" saved successfully!`, 'success');
      
      // Reset form and close
      handleClose();

      if (onTilesetGenerated) {
        onTilesetGenerated();
      }
    } catch (error) {
      console.error('Error saving tileset:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to save tileset',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setPreviewData(null);
    setGenerationParams(null);
    // Keep the form values so user can regenerate with same or modified params
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
      setPreviewData(null);
      setGenerationParams(null);
      setName('');
      setTileWidth(32);
      setTileHeight(32);
      setStyle(TilesetStyle.FANTASY);
      setCustomPrompt('');
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="secondary"
        startIcon={<AutoAwesomeIcon />}
        onClick={() => setOpen(true)}
      >
        Generate Tileset
      </Button>

      <Dialog 
        open={open} 
        onClose={() => !loading && handleClose()} 
        maxWidth={previewData ? "md" : "sm"} 
        fullWidth
      >
        <DialogTitle>
          {previewData ? 'Preview Generated Tileset' : 'Generate AI Tileset'}
        </DialogTitle>
        <DialogContent>
          {previewData ? (
            // Preview mode
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Card>
                <CardMedia
                  component="img"
                  image={previewData}
                  alt="Generated tileset preview"
                  sx={{ 
                    width: '100%', 
                    imageRendering: 'pixelated',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              </Card>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Name:</strong> {generationParams?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Tile Size:</strong> {generationParams?.tile_width}x{generationParams?.tile_height} pixels
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Style:</strong> {generationParams?.style}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Do you want to save this tileset? You can regenerate if you're not satisfied.
              </Typography>
            </Stack>
          ) : (
            // Generation form
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Tileset Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                fullWidth
                disabled={loading}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Tile Width</InputLabel>
                  <Select
                    value={tileWidth}
                    label="Tile Width"
                    onChange={(e) => setTileWidth(Number(e.target.value))}
                  >
                    {COMMON_TILE_SIZES.map((size) => (
                      <MenuItem key={size} value={size}>
                        {size}px
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Tile Height</InputLabel>
                  <Select
                    value={tileHeight}
                    label="Tile Height"
                    onChange={(e) => setTileHeight(Number(e.target.value))}
                  >
                    {COMMON_TILE_SIZES.map((size) => (
                      <MenuItem key={size} value={size}>
                        {size}px
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <FormControl fullWidth disabled={loading}>
                <InputLabel>Style Preset</InputLabel>
                <Select
                  value={style}
                  label="Style Preset"
                  onChange={(e) => setStyle(e.target.value as TilesetStyle)}
                >
                  <MenuItem value={TilesetStyle.MEDIEVAL}>Medieval</MenuItem>
                  <MenuItem value={TilesetStyle.CARTOON}>Cartoon Style</MenuItem>
                  <MenuItem value={TilesetStyle.FANTASY}>Fantasy</MenuItem>
                  <MenuItem value={TilesetStyle.SCI_FI}>Sci-Fi</MenuItem>
                  <MenuItem value={TilesetStyle.DUNGEON}>Dungeon</MenuItem>
                  <MenuItem value={TilesetStyle.NATURE}>Nature</MenuItem>
                  <MenuItem value={TilesetStyle.URBAN}>Urban</MenuItem>
                  <MenuItem value={TilesetStyle.CUSTOM}>Custom</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Custom Prompt (Optional)"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                multiline
                rows={3}
                fullWidth
                disabled={loading}
                helperText={
                  style === TilesetStyle.CUSTOM
                    ? 'Describe the tileset you want to generate'
                    : 'Add additional details to refine the selected style'
                }
              />

              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">
                    Generating tileset with AI... This may take 10-30 seconds.
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {previewData ? (
            // Preview actions
            <>
              <Button onClick={handleRegenerate} disabled={loading} startIcon={<RefreshIcon />}>
                Regenerate
              </Button>
              <Button
                onClick={handleApprove}
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              >
                {loading ? 'Saving...' : 'Save Tileset'}
              </Button>
            </>
          ) : (
            // Generation actions
            <>
              <Button onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
              >
                {loading ? 'Generating...' : 'Generate'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

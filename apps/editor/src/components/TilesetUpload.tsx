'use client';

import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import UploadIcon from '@mui/icons-material/Upload';

interface TilesetUploadProps {
  projectId: string;
  onTilesetUploaded?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export default function TilesetUpload({ projectId, onTilesetUploaded }: TilesetUploadProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [tileWidth, setTileWidth] = useState(32);
  const [tileHeight, setTileHeight] = useState(32);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  const validateFile = (selectedFile: File): string | null => {
    if (!SUPPORTED_FORMATS.includes(selectedFile.type)) {
      return `Unsupported file format. Supported formats: PNG, JPEG, WebP`;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const error = validateFile(selectedFile);
    if (error) {
      setErrors({ file: error });
      setFile(null);
      showToast(error, 'error');
      return;
    }

    setErrors({});
    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!name.trim()) {
      setErrors({ name: 'Tileset name is required' });
      showToast('Tileset name is required', 'error');
      return;
    }

    if (!file) {
      setErrors({ file: 'Please select an image file' });
      showToast('Please select an image file', 'error');
      return;
    }

    if (tileWidth < 1 || tileHeight < 1) {
      setErrors({
        tileWidth: tileWidth < 1 ? 'Tile width must be at least 1' : '',
        tileHeight: tileHeight < 1 ? 'Tile height must be at least 1' : '',
      });
      showToast('Tile dimensions must be positive integers', 'error');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name.trim());
      formData.append('tile_width', tileWidth.toString());
      formData.append('tile_height', tileHeight.toString());

      const response = await fetch(`/api/projects/${projectId}/tilesets`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload tileset');
      }

      const tileset = await response.json();
      showToast(`Tileset "${tileset.name}" uploaded successfully`, 'success');
      
      // Reset form
      setName('');
      setTileWidth(32);
      setTileHeight(32);
      setFile(null);
      setModalOpen(false);

      if (onTilesetUploaded) {
        onTilesetUploaded();
      }
    } catch (error) {
      console.error('Error uploading tileset:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to upload tileset',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setModalOpen(false);
      setErrors({});
      setName('');
      setTileWidth(32);
      setTileHeight(32);
      setFile(null);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<UploadIcon />}
        onClick={() => setModalOpen(true)}
      >
        Upload Tileset
      </Button>

      <Dialog open={modalOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Upload Tileset</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Tileset Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                fullWidth
                error={!!errors.name}
                helperText={errors.name}
                disabled={loading}
              />

              <Box>
                <Typography variant="body2" gutterBottom>
                  Image File
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  disabled={loading}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  {file ? file.name : 'Select Image File'}
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileChange}
                  />
                </Button>
                {errors.file && (
                  <Typography variant="caption" color="error">
                    {errors.file}
                  </Typography>
                )}
                {file && (
                  <Typography variant="caption" color="text.secondary">
                    Size: {(file.size / 1024).toFixed(2)} KB
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Tile Width (px)"
                  type="number"
                  value={tileWidth}
                  onChange={(e) => setTileWidth(parseInt(e.target.value, 10) || 1)}
                  required
                  inputProps={{ min: 1 }}
                  error={!!errors.tileWidth}
                  helperText={errors.tileWidth}
                  disabled={loading}
                  fullWidth
                />
                <TextField
                  label="Tile Height (px)"
                  type="number"
                  value={tileHeight}
                  onChange={(e) => setTileHeight(parseInt(e.target.value, 10) || 1)}
                  required
                  inputProps={{ min: 1 }}
                  error={!!errors.tileHeight}
                  helperText={errors.tileHeight}
                  disabled={loading}
                  fullWidth
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
            >
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}



import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

interface CanvasErrorProps {
  error: string;
  onRetry?: () => void;
}

export const CanvasError = ({ error, onRetry }: CanvasErrorProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        height: '100%',
        p: 4,
      }}
    >
      <ErrorOutline sx={{ fontSize: 48, color: 'error.main' }} />
      <Typography variant="h6" color="error">
        Failed to load map
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
        {error}
      </Typography>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry} sx={{ mt: 2 }}>
          Retry
        </Button>
      )}
    </Box>
  );
};

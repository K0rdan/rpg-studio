'use client';

import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
        <Typography variant="h5" color="error" gutterBottom>
          Something went wrong!
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          {error.message || 'An unexpected error occurred.'}
        </Typography>
        {error.message.includes('Mongo') && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This looks like a database connection issue. Please check your network connection or try again later.
            </Typography>
        )}
        <Button
          variant="contained"
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
        >
          Try again
        </Button>
      </Paper>
    </Box>
  );
}

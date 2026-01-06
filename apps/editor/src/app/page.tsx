import { auth } from '@/auth';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

export default async function Home() {
  let session = null;
  let authError = false;
  
  try {
    session = await auth();
  } catch (error) {
    console.error('[Home] Auth error (DB might be unavailable):', error instanceof Error ? error.message : error);
    authError = true;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom align="center">
          RPG Studio Editor
        </Typography>
        
        {authError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Database connection unavailable. Some features may not work properly.
          </Alert>
        )}
        
        <Paper sx={{ p: 4, textAlign: 'center', mt: 4 }}>
          {session ? (
            <>
              <Typography variant="h5" gutterBottom>
                Welcome back, {session.user?.name || 'Creator'}!
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Ready to build your next adventure?
              </Typography>
              <Link href="/projects" style={{ textDecoration: 'none' }}>
                <Button
                  variant="contained"
                  size="large"
                >
                  Go to Your Projects
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Typography variant="h5" gutterBottom>
                Welcome to RPG Studio
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                A powerful 2D game editor for creating your own RPG adventures.
              </Typography>
              <Typography color="text.secondary">
                Please sign in to get started.
              </Typography>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
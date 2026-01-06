import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import NewProject from '@/components/NewProject';
import ProjectList from '@/components/ProjectList';
import { connectToDatabase } from '@/lib/mongodb';
import type { GameProject } from '@packages/types';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

export default async function ProjectsPage() {
  let session = null;
  let projects: GameProject[] = [];
  let dbError = false;
  
  try {
    session = await auth();
  } catch (error) {
    console.error('[Projects] Auth error:', error instanceof Error ? error.message : error);
    // Redirect to home if auth fails
    redirect('/');
  }
  
  // Redirect to home if not authenticated
  if (!session?.user?.id) {
    redirect('/');
  }

  try {
    const { db } = await connectToDatabase();
    
    // Query with string userId
    const projectDocs = await db.collection('projects')
      .find({ userId: session.user.id })
      .toArray();
    
    console.log('Found projects:', projectDocs.length, 'for user:', session.user.id);
    
    projects = projectDocs.map((doc) => {
      const { _id, ...rest } = doc;
      return { ...rest, id: _id.toHexString() };
    }) as unknown as GameProject[];
  } catch (error) {
    console.error('[Projects] Database error:', error instanceof Error ? error.message : error);
    dbError = true;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Your Projects
        </Typography>
        
        {dbError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Unable to load projects. Database connection failed. Please check your connection and try again.
          </Alert>
        )}
        
        <Box sx={{ mb: 4 }}>
          <NewProject />
        </Box>
        
        <ProjectList initialProjects={projects} />
      </Box>
    </Container>
  );
}

import NewProject from '@/components/NewProject';
import ProjectList from '@/components/ProjectList';
import { connectToDatabase } from '@/lib/mongodb';
import type { GameProject } from '@packages/types';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default async function Home() {
  const { db } = await connectToDatabase();
  const projectDocs = await db.collection('projects').find({}).toArray();
  
  const projects = projectDocs.map((doc) => {
    const { _id, ...rest } = doc;
    return { ...rest, id: _id.toHexString() };
  }) as unknown as GameProject[];

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          RPG Studio Editor
        </Typography>
        <Box sx={{ mb: 4 }}>
          <NewProject />
        </Box>
        <ProjectList initialProjects={projects} />
      </Box>
    </Container>
  );
}
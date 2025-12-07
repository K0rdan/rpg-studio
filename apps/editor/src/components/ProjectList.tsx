'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { GameProject } from '@packages/types';
import { useToast } from '@/context/ToastContext';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';

interface ProjectListProps {
  initialProjects: GameProject[];
}

export default function ProjectList({ initialProjects }: ProjectListProps) {
  const [projects, setProjects] = useState<GameProject[]>(initialProjects);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      showToast('Project deleted successfully', 'success');
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('An unknown error occurred', 'error');
      }
    }
  };

  return (
    <div>
      <Typography variant="h4" component="h2" gutterBottom>
        Your Projects
      </Typography>
      {projects.length === 0 ? (
        <Typography variant="body1">No projects found. Create a new one!</Typography>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Link href={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography gutterBottom variant="h5" component="div" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                      {project.name}
                    </Typography>
                  </Link>
                  <Typography variant="body2" color="text.secondary">
                    Maps: {project.maps?.length || 0} | Characters: {project.characters?.length || 0}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    color="error" 
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(project.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
}

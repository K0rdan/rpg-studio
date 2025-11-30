'use client';

import Link from 'next/link';
import type { Character } from '@packages/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';

interface CharacterListProps {
  projectId: string;
  characters: Character[];
}

export default function CharacterList({ projectId, characters }: CharacterListProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const handleDelete = async (e: React.MouseEvent, charId: string) => {
    e.preventDefault(); // Prevent Link navigation
    if (!confirm('Are you sure you want to delete this character?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/characters/${charId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete character');
      }

      showToast('Character deleted successfully', 'success');
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
    <div className="mt-4">
      <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 4 }}>
        Characters
      </Typography>
      {characters.length === 0 ? (
        <Typography variant="body1" color="text.secondary">No characters found.</Typography>
      ) : (
        <Grid container spacing={2}>
          {characters.map((char) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={char.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <Link href={`/projects/${projectId}/characters/${char.id}`} style={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      {char.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      HP: {char.hp}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ATK: {char.attack} | DEF: {char.defense}
                    </Typography>
                  </CardContent>
                </Link>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <Button 
                    size="small" 
                    color="error" 
                    startIcon={<DeleteIcon />}
                    onClick={(e) => handleDelete(e, char.id)}
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

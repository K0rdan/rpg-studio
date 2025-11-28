'use client';

import { useState } from 'react';
import { Character } from 'types';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import SaveIcon from '@mui/icons-material/Save';

interface CharacterEditorProps {
  projectId: string;
  characterId: string;
  initialData: Character;
}

export default function CharacterEditor({ projectId, characterId, initialData }: CharacterEditorProps) {
  const [character, setCharacter] = useState<Character>(initialData);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      const response = await fetch(`/api/projects/${projectId}/characters/${characterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(character),
      });

      if (!response.ok) {
        throw new Error('Failed to save character');
      }

      setMessage('Character saved successfully!');
      router.refresh();
    } catch (error) {
      console.error('Error saving character:', error);
      setMessage('Error saving character');
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Character, value: string | number) => {
    setCharacter((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h2">
          Edit Character: {character.name}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Character'}
        </Button>
      </Box>

      {message && (
        <Alert severity={isError ? 'error' : 'success'} sx={{ mb: 4 }}>
          {message}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Stats</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Name"
                name="name"
                value={character.name}
                onChange={(e) => handleChange('name', e.target.value)}
                fullWidth
              />
              <TextField
                label="HP"
                name="hp"
                type="number"
                value={character.hp}
                onChange={(e) => handleChange('hp', Number(e.target.value))}
                fullWidth
              />
              <TextField
                label="Attack"
                name="attack"
                type="number"
                value={character.attack}
                onChange={(e) => handleChange('attack', Number(e.target.value))}
                fullWidth
              />
              <TextField
                label="Defense"
                name="defense"
                type="number"
                value={character.defense}
                onChange={(e) => handleChange('defense', Number(e.target.value))}
                fullWidth
              />
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Sprite</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography color="text.secondary">Sprite selection coming soon...</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

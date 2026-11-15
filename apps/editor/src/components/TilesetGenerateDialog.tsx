'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useToast } from '@/context/ToastContext';
import { apiFetch } from '@/lib/apiFetch';
import { normalizeAssetFolderPath } from '@/lib/assetFolders';
import { areCategoriesCommonlyAdjacent } from '@/lib/generation/adjacency';
import { categoryModeOf } from '@/lib/generation/category-config';
import { SceneTestPreview } from '@/components/SceneTestPreview';
import {
  COMMON_TILE_SIZES,
  GENERATION_MODEL_IDS,
  TILE_FAMILY_CATEGORIES,
  type GenerationMode,
  type GenerationModelId,
  type GenerationPromptSection,
  type ProjectPerspective,
  type ProjectStyleSpec,
  type TileFamilyCategory,
  type TilingMode,
  type Tileset,
} from '@packages/types';

interface TilesetGenerateDialogProps {
  projectId: string;
  onTilesetGenerated?: () => void;
  iconOnly?: boolean;
  folderPath?: string;
  regenerateTilesetId?: string | null;
  hideTrigger?: boolean;
  onClose?: () => void;
}

interface TilesetGenerationParams {
  stage: 'base' | 'family' | 'transition';
  name: string;
  subjectDescription?: string;
  category?: TileFamilyCategory;
  role: 'family' | 'transition';
  tile_width: number;
  tile_height: number;
  model: GenerationModelId;
  sourceFamilyIds: string[];
  pairFamilyIds: [string, string] | null;
  regenerateTilesetId: string | null;
  prompt: string;
  promptSections: GenerationPromptSection[];
  generationMode: GenerationMode;
  tilingMode: TilingMode;
  selfTilingScore?: number;
  reviewPassed?: boolean;
  pathAutotileLayoutId?: string;
  parentMaterialId?: string;
  passedSlotIds?: string[];
}

interface TilesetGenerationResponse {
  preview_data: string;
  generation_params: TilesetGenerationParams;
}

interface FamilyOption {
  id: string;
  name: string;
  category?: TileFamilyCategory;
  generationMode?: GenerationMode;
}

interface DependentSummary {
  id: string;
  name: string;
  role: 'family' | 'transition';
  status: 'fresh' | 'stale';
}

type DialogMode = 'family' | 'transition';

function modelLabel(model: GenerationModelId): string {
  switch (model) {
    case 'gemini':
      return 'Gemini';
    case 'gpt':
      return 'GPT';
    case 'claude':
      return 'Claude (unavailable)';
    default: {
      const exhaustive: never = model;
      return exhaustive;
    }
  }
}

function usabilityText(params: TilesetGenerationParams): string {
  if (params.reviewPassed === false) {
    return params.generationMode === 'path-autotile'
      ? 'Rejected: a required path slot failed its neighbour check.'
      : 'Rejected: this surface does not self-tile.';
  }
  if (params.tilingMode === 'fixed-block') {
    return 'a single fixed 8×8 stamp';
  }
  switch (params.generationMode) {
    case 'texture':
      return params.role === 'transition'
        ? 'Transition atlas for the selected pair.'
        : 'One canonical self-tiling surface tile.';
    case 'path-autotile':
      return 'Path autotile. Only slots that passed neighbour checks can be painted.';
    case 'prop':
      return 'Isolated object with the background removed.';
    default: {
      const exhaustive: never = params.generationMode;
      return exhaustive;
    }
  }
}

export default function TilesetGenerateDialog({
  projectId,
  onTilesetGenerated,
  iconOnly = false,
  folderPath = '',
  regenerateTilesetId = null,
  hideTrigger = false,
  onClose,
}: TilesetGenerateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = internalOpen || Boolean(regenerateTilesetId);
  const [mode, setMode] = useState<DialogMode>('family');
  const [assetName, setAssetName] = useState('');
  const [subjectDescription, setSubjectDescription] = useState('');
  const [assetFolderPath, setAssetFolderPath] = useState(folderPath);
  const [category, setCategory] = useState<TileFamilyCategory>('vegetation');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('texture');
  const [parentMaterialId, setParentMaterialId] = useState('');
  const [tileSize, setTileSize] = useState<ProjectStyleSpec['tileSize']>(32);
  const [perspective, setPerspective] = useState<ProjectPerspective>('top-down');
  const [mood, setMood] = useState('');
  const [projectModel, setProjectModel] = useState<GenerationModelId>('gemini');
  const [savedProjectModel, setSavedProjectModel] = useState<GenerationModelId>('gemini');
  const [requestModel, setRequestModel] = useState<GenerationModelId>('gemini');
  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [transitions, setTransitions] = useState<Tileset[]>([]);
  const [sourceFamilyId, setSourceFamilyId] = useState('');
  const [pairA, setPairA] = useState('');
  const [pairB, setPairB] = useState('');
  const [dependents, setDependents] = useState<DependentSummary[]>([]);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [generationParams, setGenerationParams] = useState<TilesetGenerationParams | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const { showToast } = useToast();

  const isRegenerate = Boolean(regenerateTilesetId);
  const categoryGenerationMode = categoryModeOf(category);
  const effectiveGenerationMode: GenerationMode = generationMode === 'path-autotile' && category !== 'decoration'
    ? 'path-autotile'
    : categoryGenerationMode === 'creator-choice'
      ? (generationMode === 'prop' ? 'prop' : 'texture')
      : categoryGenerationMode;
  const surfaceFamilies = families.filter((family) => (
    family.generationMode !== 'prop' && family.generationMode !== 'path-autotile'
  ));

  const defaultParentId = surfaceFamilies[0]?.id ?? '';
  const selectedParentId = surfaceFamilies.some((family) => family.id === parentMaterialId)
    ? parentMaterialId
    : defaultParentId;

  useEffect(() => {
    if (!open) return;

    let active = true;
    const loadProject = async () => {
      try {
        const [projectResponse, tilesetsResponse] = await Promise.all([
          apiFetch(`/api/projects/${projectId}`),
          apiFetch(`/api/projects/${projectId}/tilesets`),
        ]);
        if (!projectResponse.ok) throw new Error('Failed to load project style');
        if (!tilesetsResponse.ok) throw new Error('Failed to load generated families');
        const project = await projectResponse.json() as {
          styleSpec?: ProjectStyleSpec;
          generationModel?: GenerationModelId;
        };
        const tilesets = await tilesetsResponse.json() as Tileset[];
        if (!active) return;
        if (project.styleSpec) {
          setTileSize(project.styleSpec.tileSize);
          setPerspective(project.styleSpec.perspective);
          setMood(project.styleSpec.mood ?? '');
        }
        const defaultModel = project.generationModel ?? 'gemini';
        setProjectModel(defaultModel);
        setSavedProjectModel(defaultModel);
        setRequestModel(defaultModel);
        const accepted = tilesets
          .filter((tileset) => tileset.generation_metadata?.generated && tileset.generation_metadata.role === 'family')
          .map((tileset) => ({
            id: tileset.id,
            name: tileset.name,
            category: tileset.generation_metadata?.category,
            generationMode: tileset.generation_metadata?.generationMode,
          }));
        setFamilies(accepted);
        setTransitions(tilesets.filter((tileset) => tileset.generation_metadata?.role === 'transition'));
        if (accepted[0]) {
          setSourceFamilyId((current) => current || accepted[0].id);
          setPairA((current) => current || accepted[0].id);
          setPairB((current) => current || accepted[1]?.id || '');
        }
        if (regenerateTilesetId) {
          const detail = await apiFetch(`/api/projects/${projectId}/tilesets/${regenerateTilesetId}`);
          if (detail.ok) {
            const tileset = await detail.json() as Tileset & { dependents?: DependentSummary[] };
            setDependents(tileset.dependents ?? []);
            const metadata = tileset.generation_metadata;
            if (metadata?.role === 'transition') {
              setMode('transition');
            }
            setAssetName(tileset.name);
            setAssetFolderPath(tileset.folderPath ?? '');
            if (metadata?.category) setCategory(metadata.category);
            if (metadata?.generationDescription) setSubjectDescription(metadata.generationDescription);
            else if (metadata?.label) setSubjectDescription(metadata.label);
            if (metadata?.generationMode) setGenerationMode(metadata.generationMode);
            if (metadata?.parentMaterialId) setParentMaterialId(metadata.parentMaterialId);
          }
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to load generation context', 'error');
      } finally {
        if (active) setStyleLoaded(true);
      }
    };
    void loadProject();
    return () => {
      active = false;
    };
  }, [open, projectId, regenerateTilesetId, showToast]);

  const openDialog = () => {
    setAssetFolderPath(folderPath);
    setInternalOpen(true);
  };

  const suggestedPartner = useMemo(() => {
    return families.find((family) => (
      family.category
      && areCategoriesCommonlyAdjacent(category, family.category)
    ));
  }, [category, families]);

  const existingSuggestedTransition = useMemo(() => {
    if (!suggestedPartner) return false;
    return transitions.some((tileset) => {
      const pair = tileset.generation_metadata?.pairFamilyIds;
      return pair?.includes(suggestedPartner.id);
    });
  }, [suggestedPartner, transitions]);

  const resetPreview = () => {
    setPreviewData(null);
    setGenerationParams(null);
    setModelError(null);
  };

  const handleClose = () => {
    setInternalOpen(false);
    resetPreview();
    setAssetName('');
    setSubjectDescription('');
    setAssetFolderPath(folderPath);
    setCategory('vegetation');
    setGenerationMode('texture');
    setMode('family');
    setSourceFamilyId('');
    setPairA('');
    setPairB('');
    setDependents([]);
    setStyleLoaded(false);
    onClose?.();
  };

  const handleGenerate = async () => {
    if (!assetName.trim() || assetName.trim().length > 64) {
      showToast('Asset name must contain 1–64 characters', 'error');
      return;
    }
    if (mode === 'family' && (!subjectDescription.trim() || subjectDescription.trim().length > 200)) {
      showToast('Enter a texture or object description (1–200 characters)', 'error');
      return;
    }
    const normalizedFolderPath = normalizeAssetFolderPath(assetFolderPath);
    if (normalizedFolderPath === null) {
      showToast('Enter a valid asset folder path (maximum 255 characters; no . or .. segments)', 'error');
      return;
    }
    setAssetFolderPath(normalizedFolderPath);
    if (mode === 'transition' && families.length < 2 && !isRegenerate) {
      showToast('Accept two families before generating a transition', 'error');
      return;
    }

    setLoading(true);
    setModelError(null);
    try {
      const patchBody: Record<string, unknown> = {
        styleSpec: {
          tileSize,
          perspective,
          ...(mood.trim() ? { mood: mood.trim() } : {}),
        },
      };
      if (projectModel !== savedProjectModel) {
        patchBody.generationModel = projectModel;
      }
      const styleResponse = await apiFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });
      if (!styleResponse.ok) {
        const error = await styleResponse.json();
        throw new Error(error.message || 'Failed to save project style');
      }
      if (projectModel !== savedProjectModel) {
        setSavedProjectModel(projectModel);
      }

      const body: Record<string, unknown> = isRegenerate
        ? { regenerateTilesetId, name: assetName.trim(), subjectDescription: subjectDescription.trim() }
        : mode === 'transition'
          ? { stage: 'transition', name: assetName.trim(), pairFamilyIds: [pairA, pairB] }
          : {
            stage: families.length === 0 ? 'base' : 'family',
            category,
            name: assetName.trim(),
            subjectDescription: subjectDescription.trim(),
            ...(effectiveGenerationMode === 'path-autotile' || categoryModeOf(category) === 'creator-choice'
              ? { generationMode: effectiveGenerationMode }
              : {}),
            ...(effectiveGenerationMode === 'path-autotile' ? { parentMaterialId: selectedParentId } : {}),
            ...(families.length > 0 && sourceFamilyId && effectiveGenerationMode !== 'path-autotile'
              ? { sourceFamilyIds: [sourceFamilyId] }
              : {}),
          };
      if (requestModel !== projectModel) {
        body.model = requestModel;
      }

      const response = await apiFetch(`/api/projects/${projectId}/tilesets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json() as { message?: string; reason?: string };
        if (error.reason) {
          setModelError(error.message || 'This model cannot be used. Pick another.');
        }
        throw new Error(error.message || 'Failed to generate tileset');
      }

      const result = await response.json() as TilesetGenerationResponse;
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
      const response = await apiFetch(`/api/projects/${projectId}/tilesets/save-generated`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generationParams,
          image_data: previewData,
          folderPath: assetFolderPath,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save tileset');
      }

      const tileset = await response.json();
      showToast(`Tileset "${tileset.name}" saved successfully!`, 'success');
      setLoading(false);
      handleClose();
      onTilesetGenerated?.();
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

  const applySuggestedTransition = () => {
    if (!suggestedPartner || families.length === 0) return;
    setMode('transition');
    setPairA(suggestedPartner.id);
    setPairB(families.find((family) => family.id !== suggestedPartner.id)?.id || '');
  };

  return (
    <>
      {!hideTrigger && (iconOnly ? (
        <Tooltip title="Generate tileset">
          <IconButton
            size="small"
            aria-label="Generate tileset"
            onClick={(event) => {
              event.stopPropagation();
              setAssetFolderPath(folderPath);
              setInternalOpen(true);
            }}
          >
            <AutoAwesomeIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AutoAwesomeIcon />}
          onClick={openDialog}
        >
          Generate Tileset
        </Button>
      ))}

      <Dialog
        open={open}
        onClick={(event) => event.stopPropagation()}
        onClose={() => {
          if (!loading) handleClose();
        }}
        maxWidth={previewData ? 'md' : 'sm'}
        fullWidth
      >
        <DialogTitle>
          {previewData
            ? 'Preview Generated Tileset'
            : isRegenerate
              ? 'Regenerate tileset'
              : 'Generate AI Tileset'}
        </DialogTitle>
        <DialogContent>
          {previewData ? (
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
              {generationParams && (
                <SceneTestPreview
                  src={previewData}
                  generationMode={generationParams.generationMode}
                  role={generationParams.role}
                  passedSlotIds={generationParams.passedSlotIds}
                />
              )}
              {generationParams?.reviewPassed === false && (
                <Alert severity="error">
                  This result failed its output contract. Reject it and describe the material more precisely.
                </Alert>
              )}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Asset name:</strong> {generationParams?.name}
                </Typography>
                {generationParams?.category && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Category:</strong> {generationParams.category}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Tile Size:</strong> {generationParams?.tile_width}x{generationParams?.tile_height} pixels
                </Typography>
                {generationParams?.generationMode && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Generation mode:</strong> {generationParams.generationMode}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Usable as:</strong>{' '}
                  {generationParams ? usabilityText(generationParams) : ''}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Perspective:</strong> {perspective}
                </Typography>
              </Box>
              {process.env.NODE_ENV === 'development' && generationParams?.prompt && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Prompt sent to the model (dev)
                  </Typography>
                  <Stack spacing={1}>
                    {(generationParams.promptSections?.length
                      ? generationParams.promptSections
                      : [{ id: 'content', title: 'Full prompt', text: generationParams.prompt }]
                    ).map((section) => (
                      <Box key={section.id} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {section.title}
                        </Typography>
                        <Typography component="pre" variant="body2" sx={{ m: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: 12 }}>
                          {section.text}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary">
                Do you want to save this tileset? You can regenerate if you are not satisfied.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={3} sx={{ mt: 1 }}>
              {isRegenerate && (
                <Alert severity={dependents.length > 0 ? 'warning' : 'info'}>
                  {dependents.length === 0
                    ? 'Regenerating replaces this tileset in place. Nothing else depends on it.'
                    : `Regenerating will mark ${dependents.length} dependent tileset(s) stale. Their current images stay usable until you regenerate them.`}
                  {dependents.map((dependent) => (
                    <Typography key={dependent.id} variant="body2">
                      {dependent.name} ({dependent.role}, {dependent.status})
                    </Typography>
                  ))}
                </Alert>
              )}

              {!isRegenerate && families.length > 0 && (
                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Generation mode</InputLabel>
                  <Select
                    value={mode}
                    label="Generation mode"
                    inputProps={{ 'aria-label': 'Generation mode' }}
                    onChange={(event) => setMode(event.target.value as DialogMode)}
                  >
                    <MenuItem value="family">Another family</MenuItem>
                    <MenuItem value="transition">Transition tiles</MenuItem>
                  </Select>
                </FormControl>
              )}

              <TextField
                label="Asset name"
                placeholder="e.g. forest-floor"
                slotProps={{ htmlInput: { 'aria-label': 'Asset name', maxLength: 64 } }}
                value={assetName}
                onChange={(event) => setAssetName(event.target.value)}
                required
                fullWidth
                disabled={loading || !styleLoaded}
              />
              <TextField
                label="Asset folder path"
                placeholder="e.g. Terrain/Forest"
                helperText="Use / between folders, or leave empty for the root folder."
                slotProps={{ htmlInput: { 'aria-label': 'Asset folder path', maxLength: 255 } }}
                value={assetFolderPath}
                onChange={(event) => setAssetFolderPath(event.target.value)}
                fullWidth
                disabled={loading || !styleLoaded}
              />

              {mode === 'family' && (
                <>
                  <TextField
                    label={effectiveGenerationMode === 'prop'
                      ? 'Object description'
                      : effectiveGenerationMode === 'path-autotile'
                        ? 'Path material'
                        : 'Texture description'}
                    helperText="Describe only the material or object to generate, not the visual style or a full image prompt."
                    placeholder={effectiveGenerationMode === 'prop'
                      ? 'e.g. small pine tree with a rounded canopy'
                      : effectiveGenerationMode === 'path-autotile'
                        ? 'e.g. compacted dry earth'
                        : 'e.g. short dense green grass with small clover'}
                    slotProps={{ htmlInput: { 'aria-label': 'Generation description', maxLength: 200 } }}
                    value={subjectDescription}
                    onChange={(event) => setSubjectDescription(event.target.value)}
                    required
                    fullWidth
                    disabled={loading || !styleLoaded}
                    multiline
                    minRows={2}
                  />
                  <FormControl fullWidth disabled={loading}>
                    <InputLabel>Asset category</InputLabel>
                    <Select
                      value={category}
                      label="Asset category"
                      inputProps={{ 'aria-label': 'Asset category' }}
                      onChange={(event) => setCategory(event.target.value as TileFamilyCategory)}
                    >
                      {TILE_FAMILY_CATEGORIES.map((value) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {category !== 'decoration' && (
                    <FormControl fullWidth disabled={loading}>
                      <InputLabel>Output contract</InputLabel>
                      <Select
                        value={effectiveGenerationMode}
                        label="Output contract"
                        inputProps={{ 'aria-label': 'Output contract' }}
                        onChange={(event) => setGenerationMode(event.target.value as GenerationMode)}
                      >
                        <MenuItem value="texture">Surface material</MenuItem>
                        {categoryModeOf(category) === 'creator-choice' && (
                          <MenuItem value="prop">Prop (isolated object)</MenuItem>
                        )}
                        <MenuItem value="path-autotile">Path autotile</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                  {effectiveGenerationMode === 'path-autotile' && (
                    surfaceFamilies.length > 0 ? (
                      <FormControl fullWidth disabled={loading}>
                        <InputLabel>Parent surface</InputLabel>
                        <Select
                          value={selectedParentId}
                          label="Parent surface"
                          inputProps={{ 'aria-label': 'Parent surface' }}
                          onChange={(event) => setParentMaterialId(event.target.value)}
                        >
                          {surfaceFamilies.map((family) => (
                            <MenuItem key={family.id} value={family.id}>{family.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Alert severity="warning">
                        Accept a surface material before generating its path autotile.
                      </Alert>
                    )
                  )}
                  {families.length > 0 && effectiveGenerationMode !== 'path-autotile' && (
                    <FormControl fullWidth disabled={loading}>
                      <InputLabel>Reference family</InputLabel>
                      <Select
                        value={sourceFamilyId}
                        label="Reference family"
                        inputProps={{ 'aria-label': 'Reference family' }}
                        onChange={(event) => setSourceFamilyId(event.target.value)}
                      >
                        {families.map((family) => (
                          <MenuItem key={family.id} value={family.id}>{family.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  {suggestedPartner && !existingSuggestedTransition && (
                    <Alert
                      severity="info"
                      action={(
                        <Button
                          color="inherit"
                          size="small"
                          aria-label="Suggested transition"
                          onClick={applySuggestedTransition}
                        >
                          Use pair
                        </Button>
                      )}
                    >
                      Suggested transition with {suggestedPartner.name}
                    </Alert>
                  )}
                </>
              )}

              {mode === 'transition' && !isRegenerate && (
                <>
                  <FormControl fullWidth disabled={loading || families.length < 2}>
                    <InputLabel>First family</InputLabel>
                    <Select
                      value={pairA}
                      label="First family"
                      inputProps={{ 'aria-label': 'Transition family A' }}
                      onChange={(event) => setPairA(event.target.value)}
                    >
                      {families.map((family) => (
                        <MenuItem key={family.id} value={family.id}>{family.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth disabled={loading || families.length < 2}>
                    <InputLabel>Second family</InputLabel>
                    <Select
                      value={pairB}
                      label="Second family"
                      inputProps={{ 'aria-label': 'Transition family B' }}
                      onChange={(event) => setPairB(event.target.value)}
                    >
                      {families.map((family) => (
                        <MenuItem key={family.id} value={family.id}>{family.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {families.length < 2 && (
                    <Alert severity="warning">Accept two families before generating a transition.</Alert>
                  )}
                </>
              )}

              <Typography variant="subtitle2">Project style</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth disabled={loading || !styleLoaded || isRegenerate}>
                  <InputLabel>Tile size</InputLabel>
                  <Select
                    value={tileSize}
                    label="Tile size"
                    onChange={(event) => setTileSize(Number(event.target.value) as ProjectStyleSpec['tileSize'])}
                  >
                    {COMMON_TILE_SIZES.map((size) => (
                      <MenuItem key={size} value={size}>{size}px</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth disabled={loading || !styleLoaded || isRegenerate}>
                  <InputLabel>Perspective</InputLabel>
                  <Select
                    value={perspective}
                    label="Perspective"
                    onChange={(event) => setPerspective(event.target.value as ProjectPerspective)}
                  >
                    <MenuItem value="top-down">Top-down</MenuItem>
                    <MenuItem value="3/4">3/4</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <TextField
                label="Mood (optional)"
                value={mood}
                onChange={(event) => setMood(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 200 } }}
                fullWidth
                disabled={loading || !styleLoaded}
              />

              <Typography variant="subtitle2">Model</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth disabled={loading || !styleLoaded}>
                  <InputLabel>Project default model</InputLabel>
                  <Select
                    value={projectModel}
                    label="Project default model"
                    inputProps={{ 'aria-label': 'Project default model' }}
                    onChange={(event) => {
                      const next = event.target.value as GenerationModelId;
                      setProjectModel(next);
                      setRequestModel(next);
                    }}
                  >
                    {GENERATION_MODEL_IDS.map((model) => (
                      <MenuItem key={model} value={model}>{modelLabel(model)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth disabled={loading || !styleLoaded}>
                  <InputLabel>Generation model</InputLabel>
                  <Select
                    value={requestModel}
                    label="Generation model"
                    inputProps={{ 'aria-label': 'Generation model' }}
                    onChange={(event) => setRequestModel(event.target.value as GenerationModelId)}
                  >
                    {GENERATION_MODEL_IDS.map((model) => (
                      <MenuItem key={model} value={model}>{modelLabel(model)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              {modelError && (
                <Alert severity="error">{modelError}</Alert>
              )}

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
            <>
              <Button onClick={resetPreview} disabled={loading} startIcon={<RefreshIcon />}>
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                variant="contained"
                disabled={loading || generationParams?.reviewPassed === false}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              >
                {loading ? 'Saving...' : 'Accept'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                variant="contained"
                disabled={loading || (mode === 'transition' && families.length < 2 && !isRegenerate) || (effectiveGenerationMode === 'path-autotile' && !selectedParentId)}
                startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
              >
                {loading ? 'Generating...' : isRegenerate ? 'Regenerate' : 'Generate'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

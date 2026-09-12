'use client';

import { useState } from 'react';
import {
  Add,
  ArrowDownward,
  ArrowUpward,
  DeleteOutlined,
  FilterCenterFocus,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Layer, LayerRenderPriority } from '@packages/types';
import { hasPaintedTiles } from '@/lib/mapLayers';
import { useEditorStore } from '@/stores/editorStore';
import { useMapStore } from '@/stores/mapStore';

interface LayerRowProps {
  layer: Layer;
  index: number;
  layerCount: number;
  active: boolean;
  isolated: boolean;
  isolateActive: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onPriorityChange: (priority: LayerRenderPriority) => void;
  onIsolate: () => void;
  onRemove: () => void;
}

const visibilityAriaLabel = (layer: Layer, isolated: boolean): string => {
  if (isolated) return `Exit isolate ${layer.name}`;
  return `${layer.visible === false ? 'Show' : 'Hide'} ${layer.name}`;
};

const visibilityTooltip = (layer: Layer, isolated: boolean, isolateActive: boolean): string => {
  if (isolated) return 'Exit isolate (Alt-click)';
  if (isolateActive) return 'Isolate this layer (Alt-click)';
  return layer.visible === false
    ? 'Show layer · Isolate layer (Alt-click)'
    : 'Hide layer · Isolate layer (Alt-click)';
};

const LayerRow = ({
  layer,
  index,
  layerCount,
  active,
  isolated,
  isolateActive,
  onSelect,
  onRename,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onPriorityChange,
  onIsolate,
  onRemove,
}: LayerRowProps) => {
  const [name, setName] = useState(layer.name);

  const commitName = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setName(layer.name);
      return;
    }
    onRename(trimmedName);
  };

  return (
    <Paper
      variant="outlined"
      onClick={onSelect}
      data-testid={`layer-item-${index}`}
      data-focused={active ? 'true' : 'false'}
      data-isolated={isolated ? 'true' : 'false'}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        py: 0.5,
        cursor: 'pointer',
        borderColor: isolated ? 'warning.main' : active ? 'primary.main' : '#333',
        bgcolor: isolated
          ? 'rgba(255, 167, 38, 0.16)'
          : active
            ? 'rgba(33, 150, 243, 0.12)'
            : '#1d1d1d',
      }}
    >
      <Tooltip title={visibilityTooltip(layer, isolated, isolateActive)}>
        <IconButton
          size="small"
          aria-label={visibilityAriaLabel(layer, isolated)}
          data-testid={`toggle-layer-visibility-${index}`}
          onClick={(event) => {
            event.stopPropagation();
            if (event.altKey) {
              onIsolate();
              return;
            }
            onToggleVisibility();
          }}
          sx={{ color: isolated ? 'warning.main' : layer.visible === false ? '#666' : '#bbb' }}
        >
          {isolated
            ? <FilterCenterFocus fontSize="small" />
            : layer.visible === false
              ? <VisibilityOff fontSize="small" />
              : <Visibility fontSize="small" />}
        </IconButton>
      </Tooltip>

      <TextField
        value={name}
        size="small"
        variant="standard"
        onFocus={onSelect}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        slotProps={{
          htmlInput: {
            'aria-label': `Layer ${index + 1} name`,
            'data-testid': `layer-name-${index}`,
          },
        }}
        sx={{
          flex: 1,
          '& .MuiInputBase-input': { color: '#ddd', fontSize: '0.75rem', py: 0.25 },
          '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
        }}
      />

      <Tooltip title="Render priority relative to characters">
        <Select<LayerRenderPriority>
          value={layer.priority ?? 'below'}
          size="small"
          aria-label={`${layer.name} render priority`}
          data-testid={`layer-priority-${index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onPriorityChange(event.target.value)}
          sx={{
            width: 76,
            color: '#bbb',
            fontSize: '0.68rem',
            '& .MuiSelect-select': { py: 0.5, px: 0.75 },
          }}
        >
          <MenuItem value="below">Below</MenuItem>
          <MenuItem value="same">Same</MenuItem>
          <MenuItem value="above">Above</MenuItem>
        </Select>
      </Tooltip>

      <Tooltip title="Move layer up">
        <span>
          <IconButton
            size="small"
            aria-label={`Move ${layer.name} up`}
            disabled={index === layerCount - 1}
            onClick={(event) => {
              event.stopPropagation();
              onMoveUp();
            }}
          >
            <ArrowUpward fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Move layer down">
        <span>
          <IconButton
            size="small"
            aria-label={`Move ${layer.name} down`}
            disabled={index === 0}
            onClick={(event) => {
              event.stopPropagation();
              onMoveDown();
            }}
          >
            <ArrowDownward fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={layerCount === 1 ? 'A map must keep one layer' : 'Delete layer'}>
        <span>
          <IconButton
            size="small"
            aria-label={`Delete ${layer.name}`}
            data-testid={`delete-layer-${index}`}
            disabled={layerCount === 1}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            sx={{ '&:hover': { color: 'error.main' } }}
          >
            <DeleteOutlined fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
};

export const LayerPanel = () => {
  const map = useMapStore((state) => state.currentMap);
  const addLayer = useMapStore((state) => state.addLayer);
  const renameLayer = useMapStore((state) => state.renameLayer);
  const removeLayer = useMapStore((state) => state.removeLayer);
  const moveLayer = useMapStore((state) => state.moveLayer);
  const toggleLayerVisibility = useMapStore((state) => state.toggleLayerVisibility);
  const setLayerPriority = useMapStore((state) => state.setLayerPriority);
  const activeLayer = useEditorStore((state) => state.map.activeLayer);
  const isolateLayers = useEditorStore((state) => state.map.isolateLayers);
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);
  const setIsolateLayers = useEditorStore((state) => state.setIsolateLayers);

  if (!map) return null;

  const handleAdd = () => {
    const nextActiveLayer = addLayer();
    if (nextActiveLayer !== null) setActiveLayer(nextActiveLayer);
  };

  const handleRemove = (index: number) => {
    const layer = map.layers[index];
    if (!layer) return;

    if (
      hasPaintedTiles(layer) &&
      !window.confirm(`Delete "${layer.name}" and all of its tiles?`)
    ) {
      return;
    }

    setActiveLayer(removeLayer(index, activeLayer));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    setActiveLayer(moveLayer(index, direction, activeLayer));
  };

  const handleIsolate = (index: number) => {
    if (isolateLayers && activeLayer === index) {
      setIsolateLayers(false);
      return;
    }
    setActiveLayer(index);
    setIsolateLayers(true);
  };

  return (
    <Box data-testid="layer-panel" data-isolate={isolateLayers ? 'true' : 'false'}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box>
          <Typography variant="overline" sx={{ color: '#aaa', fontSize: '0.62rem', fontWeight: 700 }}>
            Layers
          </Typography>
          <Typography variant="caption" sx={{ color: '#555', ml: 1 }}>
            {map.layers.length}
          </Typography>
          {isolateLayers && (
            <Typography
              component="span"
              data-testid="layer-isolate-indicator"
              variant="caption"
              sx={{ color: 'warning.main', ml: 1 }}
            >
              Isolated
            </Typography>
          )}
        </Box>
        <Tooltip title="Add layer">
          <IconButton
            size="small"
            aria-label="Add layer"
            data-testid="add-layer"
            onClick={handleAdd}
            sx={{ color: 'primary.main' }}
          >
            <Add fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {[...map.layers].reverse().map((layer, reversedIndex) => {
          const index = map.layers.length - 1 - reversedIndex;
          return (
            <LayerRow
              key={`${index}-${layer.name}`}
              layer={layer}
              index={index}
              layerCount={map.layers.length}
              active={activeLayer === index}
              isolated={isolateLayers && activeLayer === index}
              isolateActive={isolateLayers}
              onSelect={() => setActiveLayer(index)}
              onRename={(name) => renameLayer(index, name)}
              onMoveUp={() => handleMove(index, 'up')}
              onMoveDown={() => handleMove(index, 'down')}
              onToggleVisibility={() => toggleLayerVisibility(index)}
              onPriorityChange={(priority) => setLayerPriority(index, priority)}
              onIsolate={() => handleIsolate(index)}
              onRemove={() => handleRemove(index)}
            />
          );
        })}
      </Box>
    </Box>
  );
};

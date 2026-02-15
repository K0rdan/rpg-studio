import { IconButton, Tooltip } from '@mui/material';
import { ReactNode } from 'react';

interface ToolButtonProps {
  icon: ReactNode;
  tooltip: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export const ToolButton = ({ 
  icon, 
  tooltip, 
  active = false, 
  onClick, 
  disabled = false 
}: ToolButtonProps) => {
  return (
    <Tooltip title={tooltip} placement="right" arrow>
      <span>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: 40,
            height: 40,
            margin: '8px',
            borderRadius: '4px',
            color: active ? '#fff' : '#ccc',
            bgcolor: active ? '#0d7377' : 'transparent',
            '&:hover': {
              bgcolor: active ? '#0d7377' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
            },
            '&.Mui-disabled': {
              color: '#666',
            },
          }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
};

// ActivityCard.tsx
import React, { ChangeEvent, useState } from 'react';
import { Card, CardContent, IconButton, TextField } from '@mui/material';
import { Delete, Add } from '@mui/icons-material';

export interface ActivityCardProps {
  idx: number;
  content?: string;
  deleteCardHandler: (idx: number) => void;
  addCardHandler: (idx: number) => void;
}

export const ActivityCard = ({ idx, content, deleteCardHandler, addCardHandler }: ActivityCardProps) => {
  const [activityTxt, setActivityTxt] = useState<string>(content ? content : "");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  const handleContentChange = (e: ChangeEvent<{ name?: string; value: string }>) => {
    setActivityTxt(e.target.value);
  };

  return (
    <Card
      className={`
        transition-all duration-200
        ${isActive ? 'ring-2 ring-blue-200 bg-blue-50' : ''}
      `}
      onMouseEnter={() => setHoveredCard(idx)}
      onMouseLeave={() => setHoveredCard(null)}
      sx={{
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        marginBottom: '8px',
        '&:last-child': {
          marginBottom: 0
        }
      }}
    >
      <CardContent sx={{
        padding: '12px !important',
        '&:last-child': {
          paddingBottom: '12px !important'
        }
      }}>
        {hoveredCard === idx && (
          <div className="absolute top-2 right-2 flex gap-2">
            <IconButton
              onClick={() => deleteCardHandler(idx)}
              size="small"
              sx={{
                padding: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
            <IconButton
              onClick={() => addCardHandler(idx)}
              size="small"
              sx={{
                padding: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              <Add fontSize="small" />
            </IconButton>
          </div>
        )}
        <TextField
          fullWidth
          variant="standard"
          value={activityTxt}
          placeholder="Enter Activity"
          onChange={handleContentChange}
          onFocus={() => setIsActive(true)}
          onBlur={() => setIsActive(false)}
          sx={{
            '& .MuiInput-root': {
              fontSize: '0.9375rem',
              color: 'rgba(0, 0, 0, 0.87)',
              '&:before': {
                borderBottom: 'none'
              },
              '&:hover:before': {
                borderBottom: 'none !important'
              },
              '&:after': {
                borderBottom: 'none'
              }
            },
            '& .MuiInput-input': {
              padding: '0px'
            }
          }}
        />
      </CardContent>
    </Card>
  );
};

export default ActivityCard;

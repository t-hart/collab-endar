import React, { ChangeEvent, useState } from 'react';
import { AccordionActionsProps, Card, CardContent, IconButton, TextField } from '@mui/material';
import { Delete, Add } from '@mui/icons-material';


export interface ActivityCardProps {
  idx: number
  content?: string
  deleteCardHandler: (idx: number) => void
  addCardHandler: (idx: number) => void
}

export const ActivityCard = ({ idx, content, deleteCardHandler, addCardHandler }: ActivityCardProps) => {
  const [activityTxt, setActivityTxt] = useState<string>(content ? content : "");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  console.log(`Passed content: ${content}; idx: ${idx}`)

  const handleContentChange = (e: ChangeEvent<{ name?: string; value: string }>) => {
    console.log(`My card idx: ${idx}`)
    setActivityTxt(e.target.value)
  }

  return (
    <Card
      key={idx}
      className="mb-4 relative"
      onMouseEnter={() => setHoveredCard(idx)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      <CardContent>
        {hoveredCard === idx && (
          <div className="absolute top-2 right-2 flex gap-2">
            <IconButton
              onClick={() => deleteCardHandler(idx)}
              size="small"
            >
              <Delete />
            </IconButton>
            <IconButton
              onClick={() => addCardHandler(idx)}
              size="small"
            >
              <Add />
            </IconButton>
          </div>
        )}
        <TextField
          fullWidth
          variant="standard"
          value={activityTxt}
          placeholder="Enter Activity"
          onChange={handleContentChange}

        />
      </CardContent>
    </Card >
  );
};

export default ActivityCard;
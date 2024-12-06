// ActivityCard.tsx
import React, { ChangeEvent, useState, useEffect } from 'react';
import { Card, CardContent, IconButton, TextField } from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import AddDelButtons from './AddDelButtons';
import { AddType, AddProps } from '../helpers/interface';
import { HubConnection } from '@microsoft/signalr';

export interface ActivityCardProps {
  id: number;
  content?: string;
  delActvCardHandler: (id: number) => void;
  addActvCardHandler: (props: AddProps) => void;
  connection: HubConnection;
}

export const ActivityCard = ({ id, content, delActvCardHandler, addActvCardHandler, connection }: ActivityCardProps) => {
  const [activityTxt, setActivityTxt] = useState<string>(content ? content : "");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  const handleContentChange = (e: ChangeEvent<{ name?: string; value: string }>) => {
    setActivityTxt(e.target.value);
  };

  console.log(`id of the card: ${id}`)

  useEffect(() => {
    connection.on("activityAdded", (activity) => {
      console.log("[SignalR] activityAdded: ", activity);
    });

    connection.on("activityDeleted", (id) => {
      console.log("[SignalR] activityDeleted: ", id);
    });

    connection.on("lockActivity", (id) => {
      console.log("[SignalR] lockActivity: ", id);
    });

    connection.on("activityUpdated", (update) => {
      console.log("[SignalR] activityUpdated: ", update);
    });
  })

  return (
    <Card
      className={`
        transition-all duration-200
        ${isActive ? 'ring-2 ring-blue-200 bg-blue-50' : ''}
      `}
      onMouseEnter={() => setHoveredCard(id)}
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
        {hoveredCard === id && <AddDelButtons
          id={id}
          deleteCardHandler={delActvCardHandler}
          addCardHandler={addActvCardHandler}
        ></AddDelButtons>}
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

// ActivityCard.tsx
import React, { ChangeEvent, useState, useEffect } from 'react';
import { Card, CardContent, TextField, Typography } from '@mui/material';
import AddDelButtons from './AddDelButtons';
import { HubConnection } from '@microsoft/signalr';
import { AddProps, ActivityMsg, ErrorResponse } from '../helpers/interface';

export interface ActivityCardProps {
  userName: string;
  id: number;
  planDateStr: string;
  planId: string;
  content?: string;
  delActvCardHandler: (id: number) => void;
  addActvCardHandler: (props: AddProps) => void;
  connection: HubConnection;
}

export const ActivityCard = ({ userName, id, planDateStr, planId, content, delActvCardHandler, addActvCardHandler, connection }: ActivityCardProps) => {
  const [activityText, setActivityText] = useState<string>(content ? content : "");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  // const [isActive, setIsActive] = useState(false);
  const [isMeEditing, setIsMeEditing] = useState<boolean | null>(null);
  const [otherIsTyping, setOtherIsTyping] = useState("");


  const handleContentChange = (e: ChangeEvent<{ name?: string; value: string }>) => {
    setActivityText(e.target.value);
  };

  useEffect(() => {
    if (isMeEditing == undefined) return;

    // to lock the activity from others when editing
    if (isMeEditing) {
      (async () => {
        try {
          const response = await fetch(`/api/lockActivity/${planId}/${planDateStr}/${id}`, {
            method: "POST",
            body: JSON.stringify({ lockedBy: userName }),
          });
          if (!response.ok) {
            const data = await response.json()
            alert(`Error received from lockActivity API: ${(data as ErrorResponse).error}`)
          }
        } catch (err) {
          alert(`Failed calling lockActivity API`)
        }
      })();
      return
    }

    // to update DB and others after completing edit
    (async () => {
      try {
        const response = await fetch(`/api/updateActivity/${planId}/${planDateStr}/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ activityText: activityText, updatedBy: userName }),
        });
        if (!response.ok) {
          const data = await response.json()
          alert(`Error received from updateActivity API: ${(data as ErrorResponse).error}`)
        }
      } catch (err) {
        alert(`Failed calling updateActivity API`)
      }
    })();

  }, [isMeEditing])


  // signalR listeners
  useEffect(() => {
    const updateActivityHandler = (msg: unknown) => {
      const activityMsg = msg as ActivityMsg
      if (!(activityMsg.byUser != userName && activityMsg.dateId == planDateStr && activityMsg.id == id)) return;

      console.log("[SignalR] activityUpdated: ", msg);
      if (activityMsg.activityText == undefined) {
        alert("Received undefined activityText from activityUpdated SignalR event")
        return
      }
      setActivityText(activityMsg.activityText);
      setOtherIsTyping("");
    }

    const lockActivityHandler = (msg: unknown) => {
      const activityMsg = msg as ActivityMsg
      if (!(activityMsg.byUser != userName && activityMsg.dateId == planDateStr && activityMsg.id == id)) return;
      console.log("[SignalR] lockActivity: ", msg);
      setOtherIsTyping(activityMsg.byUser);

    }

    // Register event handlers
    connection.on("activityUpdated", updateActivityHandler);
    connection.on("lockActivity", lockActivityHandler);
    console.log(`Registered event handlers in activity ${id}`)

    // Cleanup when unmounted
    return () => {
      connection.off("activityUpdated", updateActivityHandler);
      connection.off("lockActivity", lockActivityHandler);
      console.log(`Cleaned up event handlers in activity ${id}`)
    };

  }, [])

  // component render
  // TODO: add logics and style to lock this component when needed
  // ${isActive ? 'ring-2 ring-blue-200 bg-blue-50' : ''}
  return (
    <Card
      className={`transition-all duration-200`}
      onMouseEnter={() => setHoveredCard(id)}
      onMouseLeave={() => setHoveredCard(null)}
      sx={{
        position: 'relative',  // Add this
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        marginBottom: '8px',
        '&:last-child': {
          marginBottom: 0
        }
      }}
    >
      <Typography
        sx={{
          position: 'absolute',
          top: '0px',         // This will place it right on the border
          right: '4px',
          fontSize: '0.5rem',
          color: 'blue',
          zIndex: 1,
          backgroundColor: 'white',  // This helps it stand out against the border
          padding: '0 4px'          // Optional: adds some spacing around the text
        }}
      >
        {otherIsTyping ? `${otherIsTyping} is typing ...` : ""}
      </Typography>
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
          disabled={otherIsTyping ? true : false}
          fullWidth
          variant="standard"
          value={activityText}
          placeholder="Enter Activity"
          onChange={handleContentChange}
          onFocus={() => {
            console.log("onFocus text input: ", id);
            setIsMeEditing(true)
          }}
          onBlur={() => {
            console.log("onBlur text input: ", id);
            setIsMeEditing(false)
          }}
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

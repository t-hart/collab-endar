// ActivityCard.tsx
import React, { ChangeEvent, useState, useEffect } from 'react';
import { Card, CardContent, TextField, Typography } from '@mui/material';
import AddDelButtons from './AddDelButtons';
import ThumbUpDown from './ThumbUpDown';
import { HubConnection } from '@microsoft/signalr';
import { AddProps, ActivityMsg, ErrorResponse, PlanActivity } from '../helpers/interface';

export interface ActivityCardProps {
  userName: string;
  planActivity: PlanActivity;
  planDateStr: string;
  planId: string;
  delActvCardHandler: (id: number) => void;
  addActvCardHandler: (props: AddProps) => void;
  connection: HubConnection;
}

export const ActivityCard = ({
  userName,
  planActivity,
  planDateStr,
  planId,
  delActvCardHandler,
  addActvCardHandler,
  connection,
}: ActivityCardProps) => {

  const id = planActivity.id
  const content = planActivity.activityText


  const [activityText, setActivityText] = useState<string>(
    content ? content : ''
  );
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  // const [isActive, setIsActive] = useState(false);
  const [isMeEditing, setIsMeEditing] = useState<boolean | null>(null);
  const [toSyncPendingEdit, setToSyncPendingEdit] = useState<boolean | null>(
    null
  );
  const [otherIsTyping, setOtherIsTyping] = useState('');

  const handleContentChange = (
    e: ChangeEvent<{ name?: string; value: string }>
  ) => {
    setActivityText(e.target.value);
    if (e.target.value.slice(-1) == ' ') {
      setToSyncPendingEdit(true);
    } else {
      setToSyncPendingEdit(false);
    }
  };

  useEffect(() => {
    if (isMeEditing == undefined) return;

    // to lock the activity from others when editing
    if (isMeEditing) {
      (async () => {
        try {
          const response = await fetch(
            `/api/lockActivity/${planId}/${planDateStr}/${id}`,
            {
              method: 'POST',
              body: JSON.stringify({ lockedBy: userName }),
            }
          );
          if (!response.ok) {
            const data = await response.json();
            alert(
              `Error received from lockActivity API: ${(data as ErrorResponse).error}`
            );
          }
        } catch (err) {
          alert(`Failed calling lockActivity API`);
        }
      })();
      return;
    }

    // to update DB and others after completing edit
    (async () => {
      try {
        const response = await fetch(
          `/api/updateActivity/${planId}/${planDateStr}/${id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              activityText: activityText,
              updatedBy: userName,
              isFinal: true,
            }),
          }
        );
        if (!response.ok) {
          const data = await response.json();
          alert(
            `Error received from updateActivity API: ${(data as ErrorResponse).error}`
          );
        }
      } catch (err) {
        alert(`Failed calling updateActivity API`);
      }
    })();
  }, [isMeEditing]);

  // to sync pending changes to others
  useEffect(() => {
    if (toSyncPendingEdit == undefined || !toSyncPendingEdit) return;

    (async () => {
      try {
        const response = await fetch(
          `/api/updateActivity/${planId}/${planDateStr}/${id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              activityText: activityText,
              updatedBy: userName,
              isFinal: false,
            }),
          }
        );
        if (!response.ok) {
          const data = await response.json();
          alert(
            `Error received from updateActivity API for pending changes: ${(data as ErrorResponse).error}`
          );
        }
      } catch (err) {
        alert(`Failed calling updateActivity API for pending changes`);
      }
    })();
  }, [toSyncPendingEdit]);

  // signalR listeners
  useEffect(() => {
    const updateActivityHandler = (msg: unknown) => {
      const activityMsg = msg as ActivityMsg;
      if (
        !(
          activityMsg.byUser != userName &&
          activityMsg.dateId == planDateStr &&
          activityMsg.id == id
        )
      )
        return;

      console.log('[SignalR] activityUpdated: ', msg);
      if (
        activityMsg.activityText == undefined ||
        activityMsg.isFinal == undefined
      ) {
        alert(
          'Received undefined activityText or isFinal from activityUpdated SignalR event'
        );
        return;
      }
      setActivityText(activityMsg.activityText);
      if (activityMsg.isFinal) setOtherIsTyping('');
    };

    const lockActivityHandler = (msg: unknown) => {
      const activityMsg = msg as ActivityMsg;
      if (
        !(
          activityMsg.byUser != userName &&
          activityMsg.dateId == planDateStr &&
          activityMsg.id == id
        )
      )
        return;
      console.log('[SignalR] lockActivity: ', msg);
      setOtherIsTyping(activityMsg.byUser);
    };

    // Register event handlers
    connection.on('activityUpdated', updateActivityHandler);
    connection.on('lockActivity', lockActivityHandler);
    console.log(`Registered event handlers in activity ${id}`);

    // Cleanup when unmounted
    return () => {
      connection.off('activityUpdated', updateActivityHandler);
      connection.off('lockActivity', lockActivityHandler);
      console.log(`Cleaned up event handlers in activity ${id}`);
    };
  }, []);

  // component render
  return (
    <Card
      className="transition-all duration-200"
      onMouseEnter={() => setHoveredCard(id)}
      onMouseLeave={() => setHoveredCard(null)}
      sx={{
        position: 'relative',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        marginBottom: '8px',
        backgroundColor: isMeEditing ? '#f0f8ff' : undefined,
        minHeight: '80px',
        height: 'auto',
        '&:last-child': {
          marginBottom: 0,
        },
      }}
    >
      <CardContent
        sx={{
          padding: otherIsTyping ? '32px 12px 12px 12px !important' : '12px !important',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: 'padding 0.2s ease-in-out',
          '&:last-child': {
            paddingBottom: '12px !important',
          },
        }}
      >
        {otherIsTyping && (
          <Typography
            sx={{
              position: 'absolute',
              top: '8px',
              right: '12px',
              fontSize: '0.8rem',
              color: 'blue',
              zIndex: 1,
              backgroundColor: 'white',
              padding: '0 4px',
              fontFamily: 'Helvetica, Arial, sans-serif',
            }}
          >
            {`${otherIsTyping} is typing ...`}
          </Typography>
        )}

        {hoveredCard === id && (
          <AddDelButtons
            id={id}
            deleteCardHandler={delActvCardHandler}
            addCardHandler={addActvCardHandler}
          />
        )}

        <TextField
          disabled={otherIsTyping ? true : false}
          fullWidth
          multiline
          variant="standard"
          value={activityText}
          placeholder="Enter Activity"
          onChange={handleContentChange}
          onFocus={() => setIsMeEditing(true)}
          onBlur={() => setIsMeEditing(false)}
          sx={{
            marginBottom: '8px',
            flex: 1,
            '& .MuiInput-root': {
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontSize: '1.0rem',
              color: 'rgba(0, 0, 0, 0.87)',
              height: 'auto',
              paddingBottom: '16px',
              '&:before': {
                borderBottom: 'none',
              },
              '&:hover:before': {
                borderBottom: 'none !important',
              },
              '&:after': {
                borderBottom: 'none',
              },
            },
            '& .MuiInput-input': {
              padding: '0px',
              height: 'auto',
              overflow: 'auto',
            },
          }}
        />

        <ThumbUpDown
          userName={userName}
          planActivity={planActivity}
          planId={planId}
          planDateStr={planDateStr}
          connection={connection}
        />
      </CardContent>
    </Card>
  );
};

export default ActivityCard;

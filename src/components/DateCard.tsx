import React, { useState, useEffect } from 'react';
import ActivityCard from './ActivityCard';
import { ACTV_CARD_SPREAD } from './constants';
import {
  AddType,
  AddProps,
  PlanDate,
  PlanActivity,
  getDateString,
  ErrorResponse,
  ActivityMsg,
} from '../helpers/interface';
import { Card, CardContent } from '@mui/material';
import AddDelButtons from './AddDelButtons';
import { HubConnection } from '@microsoft/signalr';

export interface DateCardProps {
  userName: string;
  planId: string;
  planDate: PlanDate;
  delDateCardHandler: (id: Date) => void;
  addDateCardHandler: (props: AddProps) => void;
  connection: HubConnection;
}

export interface ActCardProps {
  id: number;
  content?: string;
}

export const DateCard = ({
  userName,
  planId,
  planDate,
  delDateCardHandler,
  addDateCardHandler,
  connection,
}: DateCardProps) => {
  const [hoveredCard, setHoveredCard] = useState(false);
  const [activities, setActivities] = useState(planDate.activities);
  const [addedActivity, setAddedActivity] = useState<PlanActivity | null>();
  const [deletedActivity, setDeletedActivity] = useState<number | null>();

  const dateStr = getDateString(planDate.id);

  const deleteActivityHandler = (id: number) => {
    setActivities((current) => {
      console.log('Deleting activity: via deleteActivityHandler');
      if (current.length === 1) {
        alert('A date needs at least one activity');
        return current;
      }
      const idx = current.findIndex((card) => card.id == id);
      setDeletedActivity(id);
      return [...current.slice(0, idx), ...current.slice(idx + 1)];
    });
  };

  const addActivityHandler = (props: AddProps) => {
    setActivities((current) => {
      console.log('Adding new activity: via addActivityHandler');
      const idx = current.findIndex((card) => card.id === props.id);
      let newId: number;
      if (props.addType === AddType.AFTER) {
        if (idx === current.length - 1) {
          newId = (props.id as number) + ACTV_CARD_SPREAD;
        } else {
          newId = (current[idx].id + current[idx + 1].id) / 2;
        }
        const newCard: PlanActivity = { id: newId, createdBy: userName };
        setAddedActivity(newCard);

        return [
          ...current.slice(0, idx + 1),
          newCard,
          ...current.slice(idx + 1),
        ];
      } else {
        if (idx === 0) {
          newId = (props.id as number) - ACTV_CARD_SPREAD;
        } else {
          newId = (current[idx - 1].id + current[idx].id) / 2;
        }
        const newCard: PlanActivity = { id: newId, createdBy: userName };
        setAddedActivity(newCard);

        return [...current.slice(0, idx), newCard, ...current.slice(idx)];
      }
    });
  };

  // send activity DELETE event
  useEffect(
    () => {
      if (!deletedActivity && deletedActivity !== 0) return;

      (async () => {
        try {
          const response = await fetch(
            `/api/deleteActivity/${planId}/${dateStr}/${deletedActivity}/${userName}`,
            {
              method: 'DELETE',
            }
          );
          if (!response.ok) {
            const data = await response.json();
            alert(
              `Error received from deleteActivity API: ${(data as ErrorResponse).error}`
            );
          }
        } catch (err) {
          alert(`Error received while sending deleted activity`);
        }
      })();
    },
    [deletedActivity] // only run when deletedActivity changes
  );

  // send activity ADD event
  useEffect(
    () => {
      if (!addedActivity) return;

      (async () => {
        try {
          const response = await fetch(
            `/api/addActivity/${planId}/${dateStr}`,
            {
              method: 'POST',
              body: JSON.stringify(addedActivity),
            }
          );
          if (!response.ok) {
            const data = await response.json();
            alert(
              `Error received from addActivity API: ${(data as ErrorResponse).error}`
            );
          }
        } catch (err) {
          alert(`Error received while sending added activity`);
        }
      })();
    },
    [addedActivity] // only run when addedActivity changes
  );

  // signalR listeners
  useEffect(() => {
    const deleteActivitySyncHandler = (msg: unknown) => {
      const activityMsg = msg as ActivityMsg;
      if (!(activityMsg.byUser != userName && activityMsg.dateId === dateStr))
        return;

      console.log('[SignalR] activityDeleted: ', msg);

      setActivities((current) => {
        console.log('Deleting activity: via deleteActivitySyncHandler');
        if (current.length === 1) {
          alert('A date needs at least one activity');
          return current;
        }
        const idx = current.findIndex((card) => card.id == activityMsg.id);
        return [...current.slice(0, idx), ...current.slice(idx + 1)];
      });
    };

    const addActivitySyncHandler = (msg: unknown) => {
      const activityMsg = msg as ActivityMsg;
      if (!(activityMsg.byUser != userName && activityMsg.dateId === dateStr))
        return;

      console.log('[SignalR] activityAdded: ', msg);

      setActivities((current) => {
        console.log('Adding new activity: via addActivitySyncHandler');
        let foundIdx = current.length;
        for (let i = 0; i < current.length; i++) {
          if (current[i].id > activityMsg.id) {
            foundIdx = i;
            break;
          }
        }
        const copy = [...current];
        const newCard: PlanActivity = {
          id: activityMsg.id,
          createdBy: userName,
        };
        copy.splice(foundIdx, 0, newCard);
        return copy;
      });
    };

    // Register handlers
    connection.on('activityAdded', addActivitySyncHandler);
    connection.on('activityDeleted', deleteActivitySyncHandler);
    console.log(`Registered event handlers in date card ${dateStr}`);

    // Cleanup when unmounted
    return () => {
      connection.off('activityAdded', addActivitySyncHandler);
      connection.off('activityDeleted', deleteActivitySyncHandler);
      console.log(`Cleaned up event handlers in date card ${dateStr}`);
    };
  }, []);

  // component render
  return (
    <Card
      onMouseEnter={() => setHoveredCard(true)}
      onMouseLeave={() => setHoveredCard(false)}
      sx={{
        boxShadow: 'none',
        backgroundColor: '#52796f',
        // minWidth: '350px'
      }}
    >
      <CardContent
        sx={{
          padding: '16px',
          '&:last-child': {
            paddingBottom: '16px',
          },
        }}
      >
        {hoveredCard && (
          <AddDelButtons
            id={planDate.id}
            deleteCardHandler={delDateCardHandler}
            addCardHandler={addDateCardHandler}
          ></AddDelButtons>
        )}
        <h3 style={{ fontFamily: 'Helvetica', color: 'white' }}>{dateStr}</h3>
        <div className='space-y-2'>
          {activities.map((card) => (
            <ActivityCard
              key={card.id}
              userName={userName}
              planActivity={card}
              planDateStr={dateStr}
              planId={planId}
              delActvCardHandler={deleteActivityHandler}
              addActvCardHandler={addActivityHandler}
              connection={connection}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DateCard;

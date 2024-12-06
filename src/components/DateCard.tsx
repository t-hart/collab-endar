import React, { useState, useEffect } from 'react';
import ActivityCard from './ActivityCard';
import { ACTV_CARD_SPREAD } from './constants';
import { AddType, AddProps, PlanDate, PlanActivity, getDateString, ErrorResponse } from '../helpers/interface';
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

export const DateCard = ({ userName, planId, planDate, delDateCardHandler, addDateCardHandler, connection }: DateCardProps) => {
    const [hoveredCard, setHoveredCard] = useState(false);
    const [activities, setActivities] = useState(planDate.activities);
    const [addedActivity, setAddedActivity] = useState<PlanActivity | null>();
    const [deletedActivity, setDeletedActivity] = useState<number | null>();

    const dateStr = getDateString(planDate.id)

    const deleteActivityHandler = (id: number) => {
        setActivities(current => {
            if (current.length === 1) {
                alert("A date needs at least one activity")
                return current
            }
            const idx = current.findIndex(card => card.id === id)
            return [...current.slice(0, idx),
            ...current.slice(idx + 1)]
        })
        setDeletedActivity(id);
        ;
    };

    const addActivityHandler = (props: AddProps) => {
        setActivities(current => {
            const idx = current.findIndex(card => card.id === props.id)
            let newId: number
            if (props.addType === AddType.AFTER) {
                if (idx === current.length - 1) {
                    newId = (props.id as number) + ACTV_CARD_SPREAD
                } else {
                    newId = (current[idx].id + current[idx + 1].id) / 2
                }
                const newCard: PlanActivity = { id: newId, createdBy: userName }
                setAddedActivity(newCard);

                return [...current.slice(0, idx + 1),
                    newCard,
                ...current.slice(idx + 1)]
            } else {
                if (idx === 0) {
                    newId = (props.id as number) - ACTV_CARD_SPREAD
                } else {
                    newId = (current[idx - 1].id + current[idx].id) / 2
                }
                const newCard: PlanActivity = { id: newId, createdBy: userName }
                setAddedActivity(newCard);

                return [...current.slice(0, idx),
                    newCard,
                ...current.slice(idx)]
            }
        });


    };

    // send activity DELETE event
    useEffect(() => {
        if (!deletedActivity) return;

        (async () => {
            try {
                const response = await fetch(`/api/deleteActivity/${planId}/${dateStr}/${deletedActivity}`, {
                    method: "DELETE",
                });
                if (!response.ok) {
                    const data = await response.json()
                    alert(`Error received from deleteActivity API: ${(data as ErrorResponse).error}`)
                };
            } catch (err) {
                alert(`Error received while sending deleted activity`)
            }
        })();
    },
        [deletedActivity]  // only run when deletedActivity changes
    );

    // send activity ADD event
    useEffect(() => {
        if (!addedActivity) return;

        (async () => {
            try {
                const response = await fetch(`/api/addActivity/${planId}/${dateStr}`, {
                    method: "POST",
                    body: JSON.stringify(addedActivity)
                });
                if (!response.ok) {
                    const data = await response.json()
                    alert(`Error received from addActivity API: ${(data as ErrorResponse).error}`)
                }
            } catch (err) {
                alert(`Error received while sending added activity`)
            }
        })()
    },
        [addedActivity]  // only run when addedActivity changes
    );

    // signalR listeners
    // TODO: add real handler for each event
    // TODO: call setActivities for activity added and deleted events
    useEffect(() => {
        connection.on("activityAdded", (activity) => {
            console.log("[SignalR] activityAdded: ", activity);
        });

        connection.on("activityDeleted", (id) => {
            console.log("[SignalR] activityDeleted: ", id);
        });
    })

    // component render
    return (
        <Card
            onMouseEnter={() => setHoveredCard(true)}
            onMouseLeave={() => setHoveredCard(false)}
            sx={{
                boxShadow: 'none',
                backgroundColor: '#f5f5f5'
            }}>
            <CardContent sx={{
                padding: '16px',
                '&:last-child': {
                    paddingBottom: '16px'
                }
            }}>
                {hoveredCard && <AddDelButtons
                    id={planDate.id}
                    deleteCardHandler={delDateCardHandler}
                    addCardHandler={addDateCardHandler}
                ></AddDelButtons>}
                <h3 className="text-lg font-medium mb-3">{dateStr}</h3>
                <div className="space-y-2">
                    {activities.map(card => (
                        <ActivityCard
                            key={card.id}
                            id={card.id}
                            content={card.activityText ? card.activityText : undefined}
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
import React, { useState, useEffect } from 'react';
import ActivityCard from './ActivityCard';
import { ACTV_CARD_SPREAD } from './constants';
import { AddType, AddProps, PlanDate, PlanActivity } from '../helpers/interface';
import { v4 as uuid } from 'uuid';
import { Card, CardContent, IconButton, TextField } from '@mui/material';
import AddDelButtons from './AddDelButtons';


export interface DateCardProps {
    userName: string;
    planDate: PlanDate;
    delDateCardHandler: (id: Date) => void;
    addDateCardHandler: (props: AddProps) => void;
}

export interface ActCardProps {
    id: number;
    content?: string;
}

export const DateCard = ({ userName, planDate, delDateCardHandler, addDateCardHandler }: DateCardProps) => {
    const [hoveredCard, setHoveredCard] = useState(false);
    const [cards, setCards] = useState(planDate.activities);

    useEffect(() => {
        const timer = setTimeout(() => {
            addActivity({ addType: AddType.AFTER, id: 0 });
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    const deleteActivity = (id: number) => {
        setCards(current => {
            if (current.length == 1) {
                alert("A date needs at least one activity")
                return current
            }
            const idx = current.findIndex(card => card.id === id)
            return [...current.slice(0, idx),
            ...current.slice(idx + 1)]
        });
    };

    const addActivity = (props: AddProps) => {
        setCards(current => {
            const idx = current.findIndex(card => card.id === props.id)
            let newId: number
            if (props.addType === AddType.AFTER) {
                if (idx === current.length - 1) {
                    newId = (props.id as number) + ACTV_CARD_SPREAD
                } else {
                    newId = (current[idx].id + current[idx + 1].id) / 2
                }
                const newCard: PlanActivity = { id: newId, createdBy: userName }

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

                return [...current.slice(0, idx),
                    newCard,
                ...current.slice(idx)]
            }
        });
    };

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
                <h3 className="text-lg font-medium mb-3">{planDate.id.toISOString().slice(0, 10)}</h3>
                <div className="space-y-2">
                    {cards.map(card => (
                        <ActivityCard
                            key={card.id}
                            id={card.id}
                            content={card.activityText ? card.activityText : undefined}
                            delActvCardHandler={deleteActivity}
                            addActvCardHandler={addActivity}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default DateCard;
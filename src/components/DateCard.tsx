import React, { useState, useEffect } from 'react';
import ActivityCard from './ActivityCard';
import { ACTV_CARD_STEP } from './constants';
import { AddType, AddProps } from '../helpers/interface';
import { v4 as uuid } from 'uuid';
import { Card, CardContent, IconButton, TextField } from '@mui/material';
import AddDelButtons from './AddDelButtons';


export interface DateCardProps {
    date: Date;
    delDateCardHandler: (id: Date) => void;
    addDateCardHandler: (props: AddProps) => void;
}

export interface ActCardProps {
    id: number;
    content?: string;
}

export const DateCard = ({ date, delDateCardHandler, addDateCardHandler }: DateCardProps) => {
    const [hoveredCard, setHoveredCard] = useState<Date | null>(null);
    const [cards, setCards] = useState<ActCardProps[]>([
        { id: 0 },
        { id: 1000 }
    ]);

    useEffect(() => {
        const timer = setTimeout(() => {
            addActivity({ addType: AddType.AFTER, id: 0 });
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    const deleteActivity = (id: number) => {
        setCards(current => {
            const idx = current.findIndex(card => card.id === id)
            return [...current.slice(0, idx),
            ...current.slice(idx + 1)]
        });
    };

    const addActivity = (props: AddProps) => {
        setCards(current => {
            const idx = current.findIndex(card => card.id === props.id)
            let newCard: ActCardProps
            if (props.addType === AddType.AFTER) {
                if (idx === current.length - 1) {
                    newCard = { id: props.id + ACTV_CARD_STEP }
                } else {
                    const newId = (current[idx].id + current[idx + 1].id) / 2
                    newCard = { id: newId }
                }

                return [...current.slice(0, idx + 1),
                    newCard,
                ...current.slice(idx + 1)]
            } else {
                if (idx === 0) {
                    newCard = { id: props.id - ACTV_CARD_STEP }
                } else {
                    const newId = (current[idx - 1].id + current[idx].id) / 2
                    newCard = { id: newId }
                }

                return [...current.slice(0, idx),
                    newCard,
                ...current.slice(idx)]
            }
        });
    };

    return (
        <Card
            onMouseEnter={() => setHoveredCard(date)}
            onMouseLeave={() => setHoveredCard(null)}
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
                {hoveredCard === date && <AddDelButtons
                    id={date}
                    deleteCardHandler={delDateCardHandler}
                    addCardHandler={addDateCardHandler}
                ></AddDelButtons>}
                <h3 className="text-lg font-medium mb-3">{date.toISOString().slice(0, 10)}</h3>
                <div className="space-y-2">
                    {cards.map(card => (
                        <ActivityCard
                            key={card.id}
                            id={card.id}
                            content={card.content}
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
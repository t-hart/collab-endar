import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@mui/material';
import ActivityCard from './ActivityCard';
import { ACTV_CARD_STEP } from './constants';
import { v4 as uuid } from 'uuid';


export interface DateCardProps {
    id: number;
    content?: string;
}

export const DateCard = () => {
    const [cards, setCards] = useState<DateCardProps[]>([
        { id: 0 },
        { id: 1000 }
    ]);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleAdd(0);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    const handleDelete = (id: number) => {
        setCards(current => {
            const idx = current.findIndex(card => card.id === id)
            return [...current.slice(0, idx),
            ...current.slice(idx + 1)]
        });
    };

    const handleAdd = (afterId: number) => {
        setCards(current => {
            const idx = current.findIndex(card => card.id === afterId)
            let newCard: DateCardProps
            if (idx === current.length - 1) {
                newCard = { id: afterId + ACTV_CARD_STEP, content: 'Newly added Card' }
            } else {
                const newId = (current[idx].id + current[idx + 1].id) / 2
                newCard = { id: newId, content: 'Newly added Card' }
            }

            return [...current.slice(0, idx + 1),
                newCard,
            ...current.slice(idx + 1)]
        });
    };

    return (
        <Card sx={{
            boxShadow: 'none',
            backgroundColor: '#f5f5f5'
        }}>
            <CardContent sx={{
                padding: '16px',
                '&:last-child': {
                    paddingBottom: '16px'
                }
            }}>
                <h3 className="text-lg font-medium mb-3">To Do</h3>
                <div className="space-y-2">
                    {cards.map(card => (
                        <ActivityCard
                            key={card.id}
                            id={card.id}
                            content={card.content}
                            deleteCardHandler={handleDelete}
                            addCardHandler={handleAdd}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default DateCard;
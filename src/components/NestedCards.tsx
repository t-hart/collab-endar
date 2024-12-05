import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@mui/material';
import ActivityCard from './ActivityCard';
import { v4 as uuid } from 'uuid';

export interface NestedCardsProps {
    id: string;
    content?: string;
}

export const NestedCards = () => {
    const [cards, setCards] = useState<NestedCardsProps[]>([
        { id: uuid() },
        { id: uuid() }
    ]);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleAdd(0);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    const handleDelete = (idx: number) => {
        setCards(current => [...current.slice(0, idx),
        ...current.slice(idx + 1)]);
    };

    const handleAdd = (idx: number) => {
        setCards(current => [...current.slice(0, idx + 1),
        { id: uuid(), content: 'Async Card' },
        ...current.slice(idx + 1)]);
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
                    {cards.map((card, idx) => (
                        <ActivityCard
                            key={card.id}
                            idx={idx}
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

export default NestedCards;
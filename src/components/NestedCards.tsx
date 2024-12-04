import React, { useState, useEffect } from 'react';
import { Card, CardContent, IconButton, TextField } from '@mui/material';
import { Delete } from '@mui/icons-material';
import ActivityCard from './ActivityCard';
import { v4 as uuid } from 'uuid';


export interface NestedCardsProps {
    id: string
    content?: string
}

export const NestedCards = () => {
    const [cards, setCards] = useState<NestedCardsProps[]>([
        { id: uuid() },
        { id: uuid() }
    ]);
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleAddIdx(0);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    const handleDelete = (id: string) => {
        setCards(current => current.filter(card => card.id !== id));
    };
    const handleDeleteIdx = (idx: number) => {
        setCards(current => [...current.slice(0, idx),
        ...current.slice(idx + 1)]);
    };
    const handleAdd = (id: string) => {
        setCards(current => {
            const index = current.findIndex(card => card.id === id);
            return [...current.slice(0, index + 1),
            { id: uuid(), content: 'Async Card' },
            ...current.slice(index + 1)]
        });
    };
    const handleAddIdx = (idx: number) => {
        setCards(current => [...current.slice(0, idx + 1),
        { id: uuid(), content: 'Async Card' },
        ...current.slice(idx + 1)]);
    };

    const handleContentChange = (id: string, newContent: string) => {
        setCards(current => current.map(card =>
            card.id === id ? { ...card, content: newContent } : card
        ));
    };

    return (
        <Card className="p-4">
            <CardContent>
                <h3 className="mb-4">Parent Card</h3>
                {cards.map((card, idx) => (
                    <ActivityCard
                        key={card.id}
                        idx={idx}
                        content={card.content ? card.content : undefined}
                        deleteCardHandler={handleDeleteIdx}
                        addCardHandler={handleAddIdx}
                    />
                ))}
            </CardContent>
        </Card>
    );
};

export default NestedCards;
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
            // setCards([
            //     cards[0],
            //     { id: Date.now(), content: 'Async Card' },
            //     cards[1]
            // ]);
            handleAddIdx(0);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    const handleDelete = (id: string) => {
        setCards(cards.filter(card => card.id !== id));
    };
    const handleDeleteIdx = (idx: number) => {
        setCards([...cards.slice(0, idx),
        ...cards.slice(idx + 1)]);
    };
    const handleAdd = (id: string) => {
        const index = cards.findIndex(card => card.id === id);
        setCards([...cards.slice(0, index + 1),
        { id: uuid(), content: 'Async Card' },
        ...cards.slice(index + 1)]);
    };
    const handleAddIdx = (idx: number) => {
        setCards([...cards.slice(0, idx + 1),
        { id: uuid(), content: 'Async Card' },
        ...cards.slice(idx + 1)]);
    };

    const handleContentChange = (id: string, newContent: string) => {
        setCards(cards.map(card =>
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
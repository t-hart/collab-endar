import React, { useState, useEffect, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { DateCard } from "./components/DateCard"
import { v4 as uuid } from 'uuid';
import { Stack } from '@mui/material';
import { AddProps } from './helpers/interface';
import { addDays, differenceInDays } from 'date-fns';


export interface AppProps {
  date: Date
}

function App() {
  const [dates, setDates] = useState<AppProps[]>([
    { date: new Date("2025-01-01") },
    { date: new Date("2025-01-05") },
    { date: new Date("2025-01-10") },
  ]);

  const deleteDate = (id: Date) => {
    setDates(current => {
      const idx = current.findIndex(date => date.date === id)
      return [...current.slice(0, idx),
      ...current.slice(idx + 1)]
    });
  };

  const addDate = (props: AddProps) => {
    setDates(current => {
      const idx = current.findIndex(date => date.date === props.id)
      if (idx < current.length - 1 && differenceInDays(current[idx + 1].date, current[idx].date) === 1) {
        alert("Next date already exists")
        return current;
      }
      const newCard = { date: addDays(props.id, 1) }
      return [...current.slice(0, idx + 1),
        newCard,
      ...current.slice(idx + 1)]

    })
  };

  return (
    <Stack direction="row" spacing={2}>
      {dates.map(card => (
        <DateCard
          key={card.date.toString()}
          date={card.date}
          delDateCardHandler={deleteDate}
          addDateCardHandler={addDate}
        />
      ))}
    </Stack >
  )
}

export default App;
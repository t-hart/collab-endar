import React, { useState, useEffect, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { DateCard } from "./components/DateCard"
import { v4 as uuid } from 'uuid';
import { Stack } from '@mui/material';
import { AddType, AddProps, Plan, createBasePlan, PlanDate, createPlanDate } from './helpers/interface';
import { addDays, subDays, differenceInDays } from 'date-fns';


export interface AppProps {
  date: Date
}

function App() {
  const userName = "Hieu Tran"
  const plan = createBasePlan("some_plan_name", userName, "2025-01-05", "2025-01-09");

  const [dates, setDates] = useState(plan.dates);

  const deleteDate = (id: Date) => {
    setDates(current => {
      if (current.length == 1) {
        alert("A plan needs at least one date")
        return current
      }
      const idx = current.findIndex(date => date.id === id)
      return [...current.slice(0, idx),
      ...current.slice(idx + 1)]
    });
  };

  const addDate = (props: AddProps) => {
    setDates(current => {
      const idx = current.findIndex(date => date.id === props.id)
      if (props.addType === AddType.AFTER) {
        if (idx < current.length - 1 && differenceInDays(current[idx + 1].id, current[idx].id) === 1) {
          alert("Next date already exists")
          return current;
        }
        const newCard = createPlanDate(addDays(props.id, 1), userName)
        return [...current.slice(0, idx + 1),
          newCard,
        ...current.slice(idx + 1)]
      } else {
        if (idx > 0 && differenceInDays(current[idx].id, current[idx - 1].id) === 1) {
          alert("Previous date already exists")
          return current;
        }
        const newCard = createPlanDate(subDays(props.id, 1), userName)
        return [...current.slice(0, idx),
          newCard,
        ...current.slice(idx)]

      }

    })
  };

  return (
    <Stack direction="row" spacing={2}>
      {dates.map(card => (
        <DateCard
          key={card.id.toString()}
          userName={userName}
          planDate={card}
          delDateCardHandler={deleteDate}
          addDateCardHandler={addDate}
        />
      ))}
    </Stack >
  )
}

export default App;
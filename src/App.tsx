import React, { useState, useEffect, useRef } from 'react';
import { HubConnectionBuilder, LogLevel, HubConnection } from '@microsoft/signalr';
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

  const [connection, setConnection] = useState<HubConnection | null>(null);
  useEffect(() => {
    const startSignalRConnection = async () => {
      try {
        // placeholder for now
        const planId = "plan_ee583bd1";

        // First, negotiate with the Azure Function
        const response = await fetch(`/api/negotiate`);
        if (!response.ok) {
          throw new Error(`Negotiation failed: ${response.statusText}`);
        }
        const connectionInfo = await response.json();

        const connection = new HubConnectionBuilder()
          .withUrl(connectionInfo.url, { accessTokenFactory: () => connectionInfo.accessToken })
          .withAutomaticReconnect()
          .build();

        // Add event listeners
        connection.on("planCreated", (plan) => {
          console.log("[SignalR] planCreated: ", plan);
        });

        connection.on("planDelete", (id) => {
          console.log("[SignalR] planDeleted: ", id);
        });

        connection.on("dateAdded", (date) => {
          console.log("[SignalR] dateAdded: ", date);
        });

        connection.on("dateDeleted", (id) => {
          console.log("[SignalR] dateDeleted: ", id);
        });

        connection.on("activityAdded", (activity) => {
          console.log("[SignalR] activityAdded: ", activity);
        });

        connection.on("activityDeleted", (id) => {
          console.log("[SignalR] activityDeleted: ", id);
        });

        connection.on("lockActivity", (id) => {
          console.log("[SignalR] lockActivity: ", id);
        });

        connection.on("activityUpdated", (update) => {
          console.log("[SignalR] activityUpdated: ", update);
        });

        // Start signalR connection
        await connection.start();
        console.log("Connected to SignalR hub");

        // Register user
        const registerUser = await fetch(`/api/registerUser?planId=${planId}&connectionId=${connection.connectionId}`);
        if (!registerUser.ok) {
          throw new Error(`Registering user failed: ${registerUser.statusText}`);
        }
        setConnection(connection);
      } catch (err) {
        console.error("SignalR Connection Error: ", err);
      }
    };
    startSignalRConnection();
    
    // Cleanup on unmount
    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, []);

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
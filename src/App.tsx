import React, { useState, useEffect } from 'react';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import { DateCard } from "./components/DateCard"
import { Stack } from '@mui/material';
import { AddType, AddProps, createBasePlan, PlanDate, createPlanDate, getDateString, ErrorResponse, stringifyPlanDate, DateMsg } from './helpers/interface';
import { addDays, subDays, differenceInDays } from 'date-fns';


export interface AppProps {
  date: Date
}
const userName = "Team5-user-" + Math.floor(Math.random() * 1000)

function App() {
  console.log("User name: ", userName)
  const plan = createBasePlan("some_plan_name", userName, "2025-01-05", "2025-01-09");
  const planId = plan.planMetadata.planId

  const [dates, setDates] = useState(plan.dates);
  const [addedDate, setAddedDate] = useState<PlanDate | null>();
  const [deletedDate, setDeletedDate] = useState<Date | null>();
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [error, setError] = useState("");

  const deleteDateHandler = (id: Date) => {
    setDates(current => {
      if (current.length === 1) {
        alert("A plan needs at least one date")
        return current
      }
      const idx = current.findIndex(date => date.id === id)
      return [...current.slice(0, idx),
      ...current.slice(idx + 1)]
    });
    setDeletedDate(id);
  };

  const addDateHandler = (props: AddProps) => {
    setDates(current => {
      const idx = current.findIndex(date => date.id === props.id)
      if (props.addType === AddType.AFTER) {
        if (idx < current.length - 1 && differenceInDays(current[idx + 1].id, current[idx].id) === 1) {
          alert("Next date already exists")
          return current;
        }
        const newCard = createPlanDate(addDays(props.id, 1), userName)
        setAddedDate(newCard)
        return [...current.slice(0, idx + 1),
          newCard,
        ...current.slice(idx + 1)]
      } else {
        if (idx > 0 && differenceInDays(current[idx].id, current[idx - 1].id) === 1) {
          alert("Previous date already exists")
          return current;
        }
        const newCard = createPlanDate(subDays(props.id, 1), userName)
        setAddedDate(newCard)
        return [...current.slice(0, idx),
          newCard,
        ...current.slice(idx)]

      }

    })
  };



  useEffect(() => {

    const startSignalRConnection = async () => {
      try {
        // First, negotiate with the Azure Function
        const response = await fetch(`/api/negotiate`);
        if (!response.ok) {
          throw new Error(`Negotiation failed: ${response.statusText}`);
        }
        const connectionInfo = await response.json();

        const conn = new HubConnectionBuilder()
          .withUrl(connectionInfo.url, { accessTokenFactory: () => connectionInfo.accessToken })
          .withAutomaticReconnect()
          .build();

        // Start signalR conn
        await conn.start();
        console.log("Connected to SignalR hub");

        // Register user
        const registerUser = await fetch(`/api/registerUser?planId=${planId}&connectionId=${conn.connectionId}`);
        if (!registerUser.ok) {
          const err = `Registering user failed: ${registerUser.statusText}`
          alert(err)
          setError(err)
        }
        setConnection(conn)
      } catch (err) {
        console.error("SignalR Connection Error: ", err);
        alert("Starting SignalR connection failed");
        setError("Starting SignalR connection failed")
      }
    };

    if (!connection) {
      startSignalRConnection();
    };

    // Cleanup on unmount
    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, []);

  // signalR listeners
  // TODO: add real handler for each event
  useEffect(() => {
    if (!connection) return;

    const deleteDateSyncHandler = (msg: unknown) => {
      const dateMsg = msg as DateMsg
      if (dateMsg.byUser == userName) return;

      console.log("[SignalR] dateDeleted: ", msg);

      setDates(current => {
        if (current.length === 1) {
          alert("A plan needs at least one date")
          return current
        }
        const idx = current.findIndex(date => getDateString(date.id) == dateMsg.id)
        return [...current.slice(0, idx),
        ...current.slice(idx + 1)]
      });
    }

    const addDateSyncHandler = (msg: unknown) => {
      const dateMsg = msg as DateMsg
      if (dateMsg.byUser == userName) return;

      console.log("[SignalR] dateAdded: ", msg);

      setDates(current => {
        const addedDate = new Date(dateMsg.id)
        let foundIdx = current.length;
        for (let i = 0; i < current.length; i++) {
          if (current[i].id > addedDate) {
            foundIdx = i;
            break;
          }
        }
        const copy = [...current]
        const newCard = createPlanDate(addedDate, userName)
        copy.splice(foundIdx, 0, newCard);
        return copy;
      })
    }

    // Add event listeners
    connection.on("planCreated", (plan) => {
      console.log("[SignalR] planCreated: ", plan);
    });

    connection.on("planDelete", (id) => {
      console.log("[SignalR] planDeleted: ", id);
    });

    // Register handlers
    connection.on("dateAdded", addDateSyncHandler);
    connection.on("dateDeleted", deleteDateSyncHandler);

    // Clean up handlers when unmounted
    return () => {
      connection.off("dateAdded", addDateSyncHandler);
      connection.off("dateDeleted", deleteDateSyncHandler);
    }
  }
    , [connection])

  // send Date DELETE event
  useEffect(() => {
    if (!deletedDate) return;

    (async () => {
      try {
        const response = await fetch(`/api/deleteDate/${planId}/${getDateString(deletedDate)}/${userName}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const data = await response.json()
          alert(`Error received from deleteDate API: ${(data as ErrorResponse).error}`)
        }
      } catch (err) {
        alert(`Failed calling deleteDate API`)
      }
    })();
  }, [deletedDate])

  // send Date ADD event
  useEffect(() => {
    if (!addedDate) return;

    (async () => {
      try {
        console.log(`addedDate.id type: ${addedDate.id instanceof Date}`)

        const response = await fetch(`/api/addDate/${planId}`, {
          method: "POST",
          body: stringifyPlanDate(addedDate),
        });
        if (!response.ok) {
          const data = await response.json()
          alert(`Error received from addDate API: ${(data as ErrorResponse).error}`)
        }
      } catch (err) {
        alert(`Error received while sending added activity`)
      }
    })()

  }, [addedDate])

  if (error) {
    return (
      <div>
        <h1> {error}</h1>
      </div>
    )
  } else if (!connection) {
    return (
      <div>
        <h1> Connecting to SignalR ...</h1>
      </div>
    )
  }

  return (
    <Stack direction="row" spacing={2}>
      {dates.map(card => (
        <DateCard
          key={card.id.toString()}
          userName={userName}
          planId={planId}
          planDate={card}
          connection={connection}
          delDateCardHandler={deleteDateHandler}
          addDateCardHandler={addDateHandler}
        />
      ))}
    </Stack >
  )
}

export default App;
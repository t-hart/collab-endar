import React, { useState, useEffect } from 'react';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import { DateCard } from './components/DateCard';
import {
  Box,
  Button,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LoginPage } from './components/LoginPage';
import {
  AddType,
  AddProps,
  Plan,
  createBasePlan,
  PlanDate,
  getPlan,
  createPlanDate,
  getDateString,
  ErrorResponse,
  stringifyPlanDate,
  DateMsg,
} from './helpers/interface';
import { addDays, subDays, differenceInDays } from 'date-fns';
import { v4 as uuid } from 'uuid';
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import CircularProgress from '@mui/material/CircularProgress';

export interface AppProps {
  date: Date;
}

function App() {
  const [userName, setUserName] = useState('');
  const [planName, setPlanName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [planId, setPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [dates, setDates] = useState<PlanDate[]>([]);
  const [weeks, setWeeks] = useState<Array<Array<PlanDate | null>>>([]);
  const [addedDate, setAddedDate] = useState<PlanDate | null>();
  const [deletedDate, setDeletedDate] = useState<Date | null>();
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [error, setError] = useState('');
  const [isLoginPage, setIsLoginPage] = useState(true);

  const deleteDateHandler = (id: Date) => {
    setDates((current) => {
      if (current.length === 1) {
        alert('A plan needs at least one date');
        return current;
      }
      const idx = current.findIndex((date) => date.id === id);
      return [...current.slice(0, idx), ...current.slice(idx + 1)];
    });
    setDeletedDate(id);
  };

  const addDateHandler = (props: AddProps) => {
    setDates((current) => {
      const idx = current.findIndex((date) => date.id === props.id);
      if (props.addType === AddType.AFTER) {
        if (
          idx < current.length - 1 &&
          differenceInDays(current[idx + 1].id, current[idx].id) === 1
        ) {
          alert('Next date already exists');
          return current;
        }
        const newCard = createPlanDate(addDays(props.id, 1), userName);
        setAddedDate(newCard);
        return [
          ...current.slice(0, idx + 1),
          newCard,
          ...current.slice(idx + 1),
        ];
      } else {
        if (
          idx > 0 &&
          differenceInDays(current[idx].id, current[idx - 1].id) === 1
        ) {
          alert('Previous date already exists');
          return current;
        }
        const newCard = createPlanDate(subDays(props.id, 1), userName);
        setAddedDate(newCard);
        return [...current.slice(0, idx), newCard, ...current.slice(idx)];
      }
    });
  };

  const handleCreatePlan = (
    userName: string,
    planName: string,
    startDate: string,
    endDate: string
  ) => {
    setUserName(userName);
    setPlanName(planName);
    setStartDate(startDate);
    setEndDate(endDate);
    setIsLoginPage(false);
  };

  const handleJoinPlan = (userName: string, inviteCode: string) => {
    setUserName(userName);
    setPlanId(inviteCode);
    setIsLoginPage(false);
  };

  useEffect(() => {
    const createPlan = async () => {
      try {
        const dates = eachDayOfInterval({
          start: new Date(startDate),
          end: new Date(endDate),
        }).map((date) => ({
          id: date.toISOString().split('T')[0],
        }));
        const newPlan = {
          uuid: uuid(),
          planName: planName,
          createdBy: userName,
          dates: dates,
        };
        const response = await fetch(`/api/createPlan`, {
          method: 'POST',
          body: JSON.stringify(newPlan),
        });

        const data = await response.json();
        if (!response.ok) {
          alert(`Error in createPlan: ${(data as ErrorResponse).error}`);
          return;
        }
        setPlan(data.data);
        setDates(data.data.dates);
        setPlanId(data.data.planMetadata.planId);
        setPlanName(data.data.planMetadata.planName);
      } catch (err) {
        alert(`Failed to create new plan: ${err}`);
      }
    };

    if (!planId && !isLoginPage) {
      createPlan();
    }
  }, [planName, userName, startDate, endDate, isLoginPage]);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        if (planId) {
          const fetchedPlan = await getPlan(planId);
          setPlan(fetchedPlan);
          setDates(fetchedPlan.dates);
          setPlan(fetchedPlan);
          setPlanName(fetchedPlan.planMetadata.planName);
        }
      } catch (error) {
        console.error('Failed to fetch plan:', error);
      }
    };

    fetchPlan();
  }, [planId]);

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
          .withUrl(connectionInfo.url, {
            accessTokenFactory: () => connectionInfo.accessToken,
          })
          .withAutomaticReconnect()
          .build();

        // Start signalR conn
        await conn.start();
        console.log('Connected to SignalR hub');

        // Register user
        const registerUser = await fetch(
          `/api/registerUser?planId=${planId}&connectionId=${conn.connectionId}`
        );
        if (!registerUser.ok) {
          const err = `Registering user failed: ${registerUser.statusText}`;
          alert(err);
          setError(err);
        }
        setConnection(conn);
      } catch (err) {
        console.error('SignalR Connection Error: ', err);
        alert('Starting SignalR connection failed');
        setError('Starting SignalR connection failed');
      }
    };

    if (planId && !connection) {
      startSignalRConnection();
    }

    // Cleanup on unmount
    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [planId]);

  // signalR listeners
  // TODO: add real handler for each event
  useEffect(() => {
    if (!connection) return;

    const deleteDateSyncHandler = (msg: unknown) => {
      const dateMsg = msg as DateMsg;
      if (dateMsg.byUser == userName) return;

      console.log('[SignalR] dateDeleted: ', msg);

      setDates((current) => {
        if (current.length === 1) {
          alert('A plan needs at least one date');
          return current;
        }
        const idx = current.findIndex(
          (date) => getDateString(date.id) == dateMsg.id
        );
        return [...current.slice(0, idx), ...current.slice(idx + 1)];
      });
    };

    const addDateSyncHandler = (msg: unknown) => {
      const dateMsg = msg as DateMsg;
      if (dateMsg.byUser == userName) return;

      console.log('[SignalR] dateAdded: ', msg);

      setDates((current) => {
        const addedDate = new Date(dateMsg.id);
        let foundIdx = current.length;
        for (let i = 0; i < current.length; i++) {
          if (current[i].id > addedDate) {
            foundIdx = i;
            break;
          }
        }
        const copy = [...current];
        const newCard = createPlanDate(addedDate, userName);
        copy.splice(foundIdx, 0, newCard);
        return copy;
      });
    };

    // Add event listeners
    connection.on('planCreated', (plan) => {
      console.log('[SignalR] planCreated: ', plan);
    });

    connection.on('planDelete', (id) => {
      console.log('[SignalR] planDeleted: ', id);
    });

    // Register handlers
    connection.on('dateAdded', addDateSyncHandler);
    connection.on('dateDeleted', deleteDateSyncHandler);
    console.log('Registered event handlers in app card');

    // Clean up handlers when unmounted
    return () => {
      connection.off('dateAdded', addDateSyncHandler);
      connection.off('dateDeleted', deleteDateSyncHandler);
      console.log('Cleaned up event handlers in app card');
    };
  }, [connection]);

  // send Date DELETE event
  useEffect(() => {
    if (!deletedDate) return;

    (async () => {
      try {
        const response = await fetch(
          `/api/deleteDate/${planId}/${getDateString(deletedDate)}/${userName}`,
          {
            method: 'DELETE',
          }
        );
        if (!response.ok) {
          const data = await response.json();
          alert(
            `Error received from deleteDate API: ${(data as ErrorResponse).error}`
          );
        }
      } catch (err) {
        alert(`Failed calling deleteDate API`);
      }
    })();
  }, [deletedDate]);

  // send Date ADD event
  useEffect(() => {
    if (!addedDate) return;

    (async () => {
      try {
        console.log(`addedDate.id type: ${addedDate.id instanceof Date}`);

        const response = await fetch(`/api/addDate/${planId}`, {
          method: 'POST',
          body: stringifyPlanDate(addedDate),
        });
        if (!response.ok) {
          const data = await response.json();
          alert(
            `Error received from addDate API: ${(data as ErrorResponse).error}`
          );
        }
      } catch (err) {
        alert(`Error received while sending added activity`);
      }
    })();
  }, [addedDate]);

  // Sorting dates for display
  useEffect(() => {
    const groupDatesByWeek = (
      dates: PlanDate[]
    ): Array<Array<PlanDate | null>> => {
      if (!dates || dates.length === 0) return [];

      // Convert id to Date if it's a string
      // This is a sketchy workaround, because we are not handling responses consistently
      const convertedDates = dates.map((date) => ({
        ...date,
        id: typeof date.id === 'string' ? new Date(date.id) : date.id,
      }));

      // Sort date cards in increasing order
      const sortedDates = convertedDates
        .slice()
        .sort((a, b) => a.id.getTime() - b.id.getTime());

      // Determine number of weeks to display
      const firstDate = sortedDates[0].id;
      const lastDate = sortedDates[sortedDates.length - 1].id;
      const startOfFirstWeek = startOfWeek(firstDate, { weekStartsOn: 6 });
      const endOfLastWeek = endOfWeek(lastDate, { weekStartsOn: 6 });

      // Get all dates within the range
      const allDates = eachDayOfInterval({
        start: startOfFirstWeek,
        end: endOfLastWeek,
      });

      const weeks: Array<Array<PlanDate | null>> = [];
      let currentWeek: Array<PlanDate | null> = [];

      allDates.forEach((date, index) => {
        // Find if the current date exists in the plan
        const dateCard = sortedDates.find((d) => isSameDay(d.id, date)) || null;
        currentWeek.push(dateCard);

        // After 7 days, push week, start new week
        if ((index + 1) % 7 === 0) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      });

      // Push the remaining days
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }
      return weeks;
    };

    if (dates.length > 0) {
      const weeks = groupDatesByWeek(dates);
      setWeeks(weeks);
    }
  }, [dates]);

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#e0e0e0',
        }}
      >
        <Typography variant='h6'>
          Aww shucks! Try refreshing? Error: {error}
        </Typography>
      </div>
    );
  }
  if (isLoginPage) {
    return (
      <LoginPage onCreatePlan={handleCreatePlan} onJoinPlan={handleJoinPlan} />
    );
  }

  if (!plan) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#e0e0e0',
        }}
      >
        <CircularProgress />
        <Typography variant='h6' style={{ marginLeft: '10px' }}>
          Loading plan...
        </Typography>
      </div>
    );
  }

  if (!connection) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#e0e0e0',
        }}
      >
        <CircularProgress />
        <Typography variant='h6' style={{ marginLeft: '10px' }}>
          Connecting to SignalR...
        </Typography>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#e0e0e0',
        minHeight: '100vh',
        width: '100%',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(to right, #2f3e46, #84a98c)',
          padding: '10px',
          borderRadius: '8px',
          boxSizing: 'border-box',
          marginBottom: '8px',
          color: '#ffffff',
        }}
      >
        {/* Show planName */}
        <Typography
          variant='h4'
          style={{ fontFamily: 'Helvetica', fontWeight: 'bold' }}
        >
          Plan: {plan.planMetadata.planName}
        </Typography>

        <Typography
          variant='h4'
          style={{
            fontFamily: 'Helvetica',
            fontSize: '2rem',
            textShadow: '2px 2px #000000',
            fontWeight: 'bold',
          }}
        >
          Collab-
          <span style={{ fontStyle: 'italic' }}>endar!</span>
        </Typography>

        {/* Invite code section */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Button */}
          <Button
            variant='contained'
            color='primary'
            onClick={() =>
              navigator.clipboard.writeText(plan.planMetadata.planId || '')
            }
            style={{ fontFamily: 'Helvetica' }}
          >
            Copy Invite Code
          </Button>

          {/* Invite Code */}
          <TextField
            variant='outlined'
            size='small'
            value={plan.planMetadata.planId || ''}
            InputProps={{
              readOnly: true,
              style: { padding: '0', backgroundColor: '#ffffff' },
            }}
            inputProps={{
              style: {
                padding: '8px',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                fontFamily: 'Helvetica',
              },
            }}
            sx={{
              marginLeft: '15px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              flex: 1,
              minWidth: '340px',
              maxWidth: '400px',
            }}
          />
        </Box>
      </Box>

      {/* Calendar grid */}
      <Grid
        container
        style={{
          border: '1px solid #bdbdbd',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Days of the week */}
        <Grid container item style={{ backgroundColor: '#354f52' }}>
          {[
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
          ].map((day, index) => (
            <Grid
              item
              key={day}
              style={{
                flex: '0 0 14.28%',
                maxWidth: '14.28%',
                textAlign: 'center',
                borderRight: index < 6 ? '1px solid #bdbdbd' : 'none',
                borderBottom: '1px solid #bdbdbd',
                padding: '12px 0',
                boxSizing: 'border-box',
              }}
            >
              <Typography
                variant='h6'
                style={{
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontFamily: 'Helvetica',
                }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Render week by week */}
        {weeks.map((week, weekIndex) => (
          <Grid
            container
            item
            key={`week-${weekIndex}`}
            style={{ backgroundColor: '#ffffff' }}
          >
            {week.map((dateCard, dayIndex) => (
              <Grid
                item
                key={`day-${weekIndex}-${dayIndex}`}
                style={{
                  flex: '0 0 14.28%',
                  maxWidth: '14.28%',
                  borderRight: dayIndex < 6 ? '1px solid #bdbdbd' : 'none',
                  borderBottom: '1px solid #bdbdbd',
                  padding: '10px',
                  boxSizing: 'border-box',
                }}
              >
                {planId && dateCard && (
                  <DateCard
                    userName={userName}
                    planId={planId}
                    planDate={dateCard}
                    connection={connection}
                    delDateCardHandler={deleteDateHandler}
                    addDateCardHandler={addDateHandler}
                  />
                )}
              </Grid>
            ))}
          </Grid>
        ))}
      </Grid>
    </div>
  );
}

export default App;

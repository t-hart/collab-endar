import React, { useState, useEffect, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { DateCard } from "./components/DateCard"
import { v4 as uuid } from 'uuid';

export interface AppProps {
}

function App() {
  // const [dates, setDates] = useState<AppProps[]>([
  //   { id: uuid() },
  //   { id: uuid() }
  // ]);

  return (
    <div>
      <DateCard />
    </div>
  )
}

export default App;
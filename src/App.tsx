import React, { useState, useEffect, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { NestedCards } from "./components/NestedCards"


function App() {
  return (
    <div>
      <NestedCards />
    </div>
  )
}

export default App;
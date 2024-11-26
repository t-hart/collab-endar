import React, { useState, useEffect, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

function App() {
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userName, setUserName] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up SignalR connection
  useEffect(() => {
    const setupSignalR = async () => {
      try {
        // First, negotiate with the Azure Function
        const response = await fetch('/api/negotiate'
        );

        if (!response.ok) {
          throw new Error(`Negotiation failed: ${response.statusText}`);
        }

        const connectionInfo = await response.json();

        // Build SignalR connection using the negotiation response
        const connection = new HubConnectionBuilder()
          .withUrl(connectionInfo.url, {
            accessTokenFactory: () => connectionInfo.accessToken
          })
          // .configureLogging(LogLevel.Information)
          .withAutomaticReconnect()
          .build();


        // Set up message handler
        connection.on('newMessage', (messageData) => {
          setMessages(prev => [...prev, messageData]);
        });

        // Start connection
        await connection.start();
        setConnection(connection);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error('SignalR Connection Error:', err);
        setError('Failed to connect to chat service');
        setIsConnected(false);
      }
    };

    setupSignalR();

    // Cleanup on unmount
    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !inputMessage.trim()) return;

    try {
      const messageData = {
        userName: userName,
        text: inputMessage,
        timestamp: new Date().toISOString()
      };

      await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      setInputMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  // Login form
  if (!userName) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Enter Chat Room</h1>
        <form onSubmit={(e) => {
          e.preventDefault();
          const name = e.target.userName.value.trim();
          if (name) setUserName(name);
        }} className="space-y-4">
          <input
            type="text"
            name="userName"
            placeholder="Enter your name"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="w-full px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Join Chat
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        Real-time Chat
        <span className={`ml-2 text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
          ({isConnected ? 'Connected' : 'Disconnected'})
        </span>
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Messages Container */}
      <div className="mb-4 h-96 overflow-y-auto border rounded-md p-4 bg-white">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-2 p-2 rounded-md ${msg.userName === userName ? 'bg-blue-100 ml-auto' : 'bg-gray-100'
              } max-w-[80%] ${msg.userName === userName ? 'ml-auto' : ''}`}
          >
            <div className="font-semibold text-sm">
              {msg.userName === userName ? 'You' : msg.userName}
            </div>
            <div>{msg.text}</div>
            <div className="text-xs text-gray-500">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={sendMessage} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={!isConnected}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;
import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';

interface LoginPageProps {
  onCreatePlan: (userName: string, planName: string, startDate: string, endDate: string) => void;
  onJoinPlan: (userName: string, inviteCode: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onCreatePlan, onJoinPlan }) => {
  const [userName, setUserName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [planName, setPlanName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleCreatePlan = () => {
    onCreatePlan(userName, planName, startDate, endDate);
  };

  const handleJoinPlan = () => {
    console.log("Joining plan with invite code: ", inviteCode);
    onJoinPlan(userName, inviteCode);
  };

  return (
    <Box>
      <Typography variant="h4">Travel Planner</Typography>
      <Box mt={4}>
        <TextField
          label="Your Name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          fullWidth
        />
      </Box>
      <Box mt={4}>
        <Typography variant="h6">Create a New Plan</Typography>
        <TextField
          label="Plan Name"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          margin="normal"
        />
        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          margin="normal"
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreatePlan}
          disabled={!userName || !planName || !startDate || !endDate}
        >
          Create Plan
        </Button>
      </Box>
      <Box mt={4}>
        <Typography variant="h6">Join via Invite Code</Typography>
        <TextField
          label="Invite Code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          fullWidth
          margin="normal"
        />
        <Button
          variant="contained"
          color="secondary"
          onClick={handleJoinPlan}
          disabled={!userName || !inviteCode}
        >
          Join Plan
        </Button>
      </Box>
    </Box>
  );
};
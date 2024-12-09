import React, { useState } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
} from '@mui/material';

interface LoginPageProps {
  onCreatePlan: (
    userName: string,
    planName: string,
    startDate: string,
    endDate: string
  ) => void;
  onJoinPlan: (userName: string, inviteCode: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onCreatePlan,
  onJoinPlan,
}) => {
  const [userName, setUserName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [planName, setPlanName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');

  const handleCreatePlan = () => {
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be before start date!');
      return;
    }
    setError('');
    onCreatePlan(userName, planName, startDate, endDate);
  };

  const handleJoinPlan = () => {
    console.log('Joining plan with invite code: ', inviteCode);
    onJoinPlan(userName, inviteCode);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setError('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#d3d9d4',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Card
        sx={{
          minWidth: 300,
          maxWidth: 400,
          padding: '20px 30px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          backgroundColor: '#ffffff',
        }}
      >
        <CardContent>
          <Typography
            variant='h5'
            sx={{
              textAlign: 'center',
              color: '#7d96ad',
              fontWeight: 'bold',
            }}
          >
            Travel Planner
          </Typography>
          <Box mt={3}>
            <TextField
              label='Your Name'
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              fullWidth
              variant='outlined'
            />
          </Box>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            indicatorColor='primary'
            textColor='inherit'
            variant='fullWidth'
            sx={{
              marginTop: '20px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
            }}
          >
            <Tab
              label='Create a New Plan'
              sx={{
                fontWeight: 'bold',
                color: '#555555',
                '&.Mui-selected': { color: '#7d96ad' },
              }}
            />
            <Tab
              label='Join with Invite Code'
              sx={{
                fontWeight: 'bold',
                color: '#555555',
                '&.Mui-selected': { color: '#7d96ad' },
              }}
            />
          </Tabs>
          {tab === 0 && (
            <Box mt={2}>
              <TextField
                label='Plan Name'
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                fullWidth
                margin='normal'
                variant='outlined'
              />
              <TextField
                label='Start Date'
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin='normal'
                variant='outlined'
              />
              <TextField
                label='End Date'
                type='date'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin='normal'
                variant='outlined'
              />
              {error && (
                <Typography color='error' variant='body2' sx={{ mt: 1 }}>
                  {error}
                </Typography>
              )}
              <Button
                variant='contained'
                onClick={handleCreatePlan}
                disabled={!userName || !planName || !startDate || !endDate}
                fullWidth
                sx={{
                  marginTop: '20px',
                  backgroundColor: '#1976d2',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#1565c0',
                  },
                }}
              >
                Create Plan
              </Button>
            </Box>
          )}
          {tab === 1 && (
            <Box mt={2}>
              <TextField
                label='Invite Code'
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                fullWidth
                margin='normal'
                variant='outlined'
              />
              <Button
                variant='contained'
                onClick={handleJoinPlan}
                disabled={!userName || !inviteCode}
                fullWidth
                sx={{
                  marginTop: '20px',
                  backgroundColor: '#1976d2',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#1565c0',
                  },
                }}
              >
                Join Plan
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

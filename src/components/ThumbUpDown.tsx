import React, { useEffect, useRef, useState } from 'react';
import { IconButton, Typography } from '@mui/material';
import { ThumbUpAlt, ThumbUpOffAlt, ThumbDownAlt, ThumbDownOffAlt } from '@mui/icons-material';
import { VoteType, PlanActivity, ErrorResponse, ActivityMsg } from '../helpers/interface';
import { HubConnection } from '@microsoft/signalr';

export interface ThumbUpdownProps {
  userName: string;
  planActivity: PlanActivity
  planId: string;
  planDateStr: string;
  connection: HubConnection;
}



export const ThumbUpDown = ({ userName, planActivity, planId, planDateStr, connection }: ThumbUpdownProps) => {
  const isFirstRender = useRef(true);
  const [upVoters, setUpVoters] = useState<string[]>(planActivity.upVoters ? planActivity.upVoters : []);
  const [downVoters, setDownVoters] = useState<string[]>(planActivity.downVoters ? planActivity.downVoters : []);

  let initVoteType = VoteType.NONE
  if (upVoters.includes(userName)) {
    initVoteType = VoteType.UP
  } else if (downVoters.includes(userName)) {
    initVoteType = VoteType.DOWN
  }
  const [myVote, setMyVote] = useState<VoteType>(initVoteType);


  const thumbUpOnClickHandler = () => {
    setMyVote(currType => {
      // this click is to Up vote -> add to upVoters
      if (currType !== VoteType.UP) {
        // also remove from downVoters if currently Down voted
        if (currType === VoteType.DOWN) {
          setDownVoters(currDownVoters => currDownVoters.filter(
            voter => voter !== userName
          ))
        }
        setUpVoters(currUpVoters => [...currUpVoters, userName]);
        return VoteType.UP;
      }
      // this click is to remove current Up vote -> remove from upVoters
      else {
        setUpVoters(currUpVoters => currUpVoters.filter(
          voter => voter !== userName))
        return VoteType.NONE;
      }
    })
  }

  const thumbDownOnClickHandler = () => {
    setMyVote(currType => {
      // this click is to Down vote -> add to downVoters
      if (currType !== VoteType.DOWN) {
        // also remove from upVoters if currently Up voted
        if (currType === VoteType.UP) {
          setUpVoters(currUpVoters => currUpVoters.filter(
            voter => voter !== userName
          ))
        }
        setDownVoters(currDownVoters => [...currDownVoters, userName]);
        return VoteType.DOWN;
      }
      // this click is to remove current Down vote -> remove from downVoters
      else {
        setDownVoters(currDownVoters => currDownVoters.filter(
          voter => voter !== userName))
        return VoteType.NONE;
      }
    })
  }

  // call API to sync when my vote changes
  useEffect(() => {
    // skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    (async () => {
      try {
        const response = await fetch(
          `/api/voteActivity/${planId}/${planDateStr}/${planActivity.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ upVoters: upVoters, downVoters: downVoters, voter: userName }),
          }
        );
        if (!response.ok) {
          const data = await response.json();
          alert(
            `Error received from voteActivity API: ${(data as ErrorResponse).error}`
          );
        }
      } catch (err) {
        alert(`Failed calling voteActivity API`);
      }
    })();
  }, [myVote])

  // signalR listeners
  useEffect(() => {

    const voteActivityHandler = (msg: unknown) => {
      const activityMsg = msg as ActivityMsg;
      if (
        !(
          activityMsg.byUser != userName &&
          activityMsg.dateId == planDateStr &&
          activityMsg.id == planActivity.id
        )
      )
        return;

      console.log('[SignalR] voteActivity: ', msg);
      setUpVoters(activityMsg.upVoters ? activityMsg.upVoters : [])
      setDownVoters(activityMsg.downVoters ? activityMsg.downVoters : [])
    };

    // Register event handlers
    connection.on('voteActivity', voteActivityHandler);
    console.log(`Registered vote event handlers in activity ${planActivity.id}`);

    // Cleanup when unmounted
    return () => {
      connection.off('voteActivity', voteActivityHandler);
      console.log(`Cleaned up vote event handlers in activity ${planActivity.id}`);
    };
  }, []);


  return (
    <div style={{
      position: 'absolute',
      bottom: '4px',
      right: '12px',
      display: 'flex',
      gap: '8px',
      zIndex: 1,
    }}>
      <IconButton
        onClick={thumbUpOnClickHandler}
        size="small"
        sx={{
          padding: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        {myVote == VoteType.UP ? <ThumbUpAlt fontSize="small" /> : <ThumbUpOffAlt fontSize="small" />}
      </IconButton>
      <Typography variant="caption" sx={{
        fontSize: '0.75rem',
        color: 'text.secondary',
        marginTop: '8px',
      }}>
        {upVoters.length}
      </Typography>

      <IconButton
        onClick={thumbDownOnClickHandler}
        size="small"
        sx={{
          padding: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        {myVote == VoteType.DOWN ? <ThumbDownAlt fontSize="small" /> : <ThumbDownOffAlt fontSize="small" />}
      </IconButton>
      <Typography variant="caption" sx={{
        fontSize: '0.75rem',
        color: 'text.secondary',
        marginTop: '8px',
      }}>
        {downVoters.length}
      </Typography>
    </div>
  );
};

export default ThumbUpDown;
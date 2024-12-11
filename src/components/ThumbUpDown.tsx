import React, { useState } from 'react';
import { IconButton, Typography } from '@mui/material';
import { ThumbUpAlt, ThumbUpOffAlt, ThumbDownAlt, ThumbDownOffAlt } from '@mui/icons-material';
import { VoteType, AddProps } from '../helpers/interface';

export interface ThumbUpdownProps {
  id: any;
  deleteCardHandler: (id: any) => void;
  addCardHandler: (props: AddProps) => void;
}



export const ThumbUpDown = ({ id, deleteCardHandler, addCardHandler }: ThumbUpdownProps) => {
  const [voteType, setVoteType] = useState<VoteType | null>(null);


  // const thumbUpOnClickHandler = () => {
  //   if (voteType != VoteType.UP) {
  //     setVoteType(VoteType.UP);
  //   } else {
  //     setVoteType(VoteType.NONE);
  //   }
  // }

  // const thumbDownOnClickHandler = () => {
  //   if (voteType != VoteType.DOWN) {
  //     setVoteType(VoteType.DOWN);
  //   } else {
  //     setVoteType(VoteType.NONE);
  //   }
  // }


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
        onClick={() => voteType != VoteType.UP ? setVoteType(VoteType.UP) : setVoteType(VoteType.NONE)}
        size="small"
        sx={{
          padding: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        {voteType == VoteType.UP ? <ThumbUpAlt fontSize="small" /> : <ThumbUpOffAlt fontSize="small" />}
      </IconButton>
      <Typography variant="caption" sx={{
        fontSize: '0.75rem',
        color: 'text.secondary',
        marginTop: '8px',
      }}>
        42
      </Typography>

      <IconButton
        onClick={() => voteType != VoteType.DOWN ? setVoteType(VoteType.DOWN) : setVoteType(VoteType.NONE)}
        size="small"
        sx={{
          padding: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        {voteType == VoteType.DOWN ? <ThumbDownAlt fontSize="small" /> : <ThumbDownOffAlt fontSize="small" />}
      </IconButton>
      <Typography variant="caption" sx={{
        fontSize: '0.75rem',
        color: 'text.secondary',
        marginTop: '8px',
      }}>
        8
      </Typography>
    </div>
  );
};

export default ThumbUpDown;
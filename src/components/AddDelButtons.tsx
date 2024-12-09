import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { AddType, AddProps } from '../helpers/interface';

export interface AddDelButtonsProps {
  id: any;
  deleteCardHandler: (id: any) => void;
  addCardHandler: (props: AddProps) => void;
}

export const AddDelButtons = ({
  id,
  deleteCardHandler,
  addCardHandler,
}: AddDelButtonsProps) => {
  return (
    <div className='absolute top-2 right-2 flex gap-2'>
      <Tooltip title='Add card before' arrow>
        <IconButton
          onClick={() => addCardHandler({ addType: AddType.BEFORE, id: id })}
          size='small'
          sx={{
            padding: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
          }}
        >
          <Add fontSize='small' />
        </IconButton>
      </Tooltip>

      <Tooltip title='Delete card' arrow>
        <IconButton
          onClick={() => deleteCardHandler(id)}
          size='small'
          sx={{
            padding: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
          }}
        >
          <Delete fontSize='small' />
        </IconButton>
      </Tooltip>

      <Tooltip title='Add card after' arrow>
        <IconButton
          onClick={() => addCardHandler({ addType: AddType.AFTER, id: id })}
          size='small'
          sx={{
            padding: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
          }}
        >
          <Add fontSize='small' />
        </IconButton>
      </Tooltip>
    </div>
  );
};

export default AddDelButtons;

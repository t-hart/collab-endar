// AddDelButtons.tsx
import React, { ChangeEvent, useState } from 'react';
import { Card, CardContent, IconButton, TextField } from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { AddType, AddProps } from '../helpers/interface';

export interface AddDelButtonsProps {
  id: any;
  deleteCardHandler: (id: any) => void;
  addCardHandler: (props: AddProps) => void;
}

export const AddDelButtons = ({ id, deleteCardHandler, addCardHandler }: AddDelButtonsProps) => {

  return (
    <div className="absolute top-2 right-2 flex gap-2">
      <IconButton
        onClick={() => deleteCardHandler(id)}
        size="small"
        sx={{
          padding: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        <Delete fontSize="small" />
      </IconButton>
      <IconButton
        onClick={() => addCardHandler({ id: id, addType: AddType.AFTER })}
        size="small"
        sx={{
          padding: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        <Add fontSize="small" />
      </IconButton>
    </div>
  );
};

export default AddDelButtons;

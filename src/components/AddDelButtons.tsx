import React, { useState } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { AddType, AddProps } from '../helpers/interface';

export interface AddDelButtonsProps {
  id: any;
  deleteCardHandler: (id: any) => void;
  addCardHandler: (props: AddProps) => void;
}

export const AddDelButtons = ({ id, deleteCardHandler, addCardHandler }: AddDelButtonsProps) => {
  // State for managing menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Handle menu opening
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle menu closing
  const handleClose = () => {
    setAnchorEl(null);
  };

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
        onClick={handleClick}
        size="small"
        sx={{
          padding: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        <Add fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => addCardHandler({ addType: AddType.BEFORE, id: id })}>
          Before
        </MenuItem>
        <MenuItem onClick={() => addCardHandler({ addType: AddType.AFTER, id: id })}>
          After
        </MenuItem>
      </Menu>
    </div>
  );
};

export default AddDelButtons;
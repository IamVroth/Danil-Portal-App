import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
  useTheme,
  Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../config/supabase';
import dayjs from 'dayjs';

const EXPENSE_CATEGORIES = [
  'Utilities',
  'Rent',
  'Salaries',
  'Marketing',
  'Office Supplies',
  'Equipment',
  'Maintenance',
  'Transportation',
  'Insurance',
  'Others'
];

const initialExpense = {
  date: dayjs(),
  category: '',
  description: '',
  amount: '',
  payment_method: '',
  notes: ''
};

function Expenses() {
  const theme = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState(initialExpense);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode, expense = initialExpense) => {
    setDialogMode(mode);
    setCurrentExpense(mode === 'add' ? initialExpense : {
      ...expense,
      date: dayjs(expense.date)
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentExpense(initialExpense);
  };

  const handleInputChange = (field) => (event) => {
    setCurrentExpense({
      ...currentExpense,
      [field]: event.target.value
    });
  };

  const handleDateChange = (newDate) => {
    setCurrentExpense({
      ...currentExpense,
      date: newDate
    });
  };

  const handleSave = async () => {
    try {
      const expenseData = {
        ...currentExpense,
        date: currentExpense.date.format('YYYY-MM-DD'),
        amount: parseFloat(currentExpense.amount)
      };

      if (dialogMode === 'add') {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', currentExpense.id);
        if (error) throw error;
      }

      handleCloseDialog();
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error.message);
    }
  };

  const handleOpenDeleteDialog = (expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      if (!expenseToDelete) return;

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseToDelete.id);

      if (error) throw error;

      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error.message);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          Expenses
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('add')}
        >
          Add Expense
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Payment Method</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{dayjs(expense.date).format('DD MMM YYYY')}</TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell>{expense.description}</TableCell>
                <TableCell>${expense.amount.toFixed(2)}</TableCell>
                <TableCell>{expense.payment_method}</TableCell>
                <TableCell>{expense.notes}</TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog('edit', expense)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDeleteDialog(expense)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Expense' : 'Edit Expense'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date"
                value={currentExpense.date}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} />}
              />
            </LocalizationProvider>

            <TextField
              select
              label="Category"
              value={currentExpense.category}
              onChange={handleInputChange('category')}
              fullWidth
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Description"
              value={currentExpense.description}
              onChange={handleInputChange('description')}
              fullWidth
            />

            <TextField
              label="Amount"
              type="number"
              value={currentExpense.amount}
              onChange={handleInputChange('amount')}
              fullWidth
              InputProps={{
                startAdornment: '$'
              }}
            />

            <TextField
              label="Payment Method"
              value={currentExpense.payment_method}
              onChange={handleInputChange('payment_method')}
              fullWidth
            />

            <TextField
              label="Notes"
              value={currentExpense.notes}
              onChange={handleInputChange('notes')}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this expense?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Expenses;

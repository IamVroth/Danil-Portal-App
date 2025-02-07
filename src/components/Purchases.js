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
  Tooltip,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../config/supabase';
import dayjs from 'dayjs';

const PAYMENT_STATUSES = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PARTIALLY_PAID: 'Partially Paid'
};

const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'Credit Card',
  'Check',
  'Digital Wallet',
  'Other'
];

const initialPurchase = {
  date: dayjs(),
  supplier: '',
  product_name: '',
  quantity: '',
  unit_price: '',
  total_amount: '',
  payment_status: PAYMENT_STATUSES.PENDING,
  payment_method: '',
  notes: ''
};

function Purchases() {
  const theme = useTheme();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPurchase, setCurrentPurchase] = useState(initialPurchase);
  const [dialogMode, setDialogMode] = useState('add');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode, purchase = initialPurchase) => {
    setDialogMode(mode);
    setCurrentPurchase(mode === 'add' ? initialPurchase : {
      ...purchase,
      date: dayjs(purchase.date)
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentPurchase(initialPurchase);
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setCurrentPurchase(prev => {
      const updated = {
        ...prev,
        [field]: value
      };

      // Automatically calculate total amount when quantity or unit price changes
      if (field === 'quantity' || field === 'unit_price') {
        const quantity = field === 'quantity' ? value : prev.quantity;
        const unitPrice = field === 'unit_price' ? value : prev.unit_price;
        if (quantity && unitPrice) {
          updated.total_amount = (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2);
        }
      }

      return updated;
    });
  };

  const handleDateChange = (newDate) => {
    setCurrentPurchase({
      ...currentPurchase,
      date: newDate
    });
  };

  const handleSave = async () => {
    try {
      const purchaseData = {
        ...currentPurchase,
        date: currentPurchase.date.format('YYYY-MM-DD'),
        quantity: parseInt(currentPurchase.quantity),
        unit_price: parseFloat(currentPurchase.unit_price),
        total_amount: parseFloat(currentPurchase.total_amount)
      };

      if (dialogMode === 'add') {
        const { error } = await supabase
          .from('purchases')
          .insert([purchaseData]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('purchases')
          .update(purchaseData)
          .eq('id', currentPurchase.id);
        if (error) throw error;
      }

      handleCloseDialog();
      fetchPurchases();
    } catch (error) {
      console.error('Error saving purchase:', error.message);
    }
  };

  const handleOpenDeleteDialog = (purchase) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      if (!purchaseToDelete) return;

      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseToDelete.id);

      if (error) throw error;

      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
      fetchPurchases();
    } catch (error) {
      console.error('Error deleting purchase:', error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case PAYMENT_STATUSES.PAID:
        return 'success';
      case PAYMENT_STATUSES.PARTIALLY_PAID:
        return 'warning';
      default:
        return 'error';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          Purchases
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('add')}
        >
          Add Purchase
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Unit Price</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Payment Status</TableCell>
              <TableCell>Payment Method</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchases.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell>{dayjs(purchase.date).format('DD MMM YYYY')}</TableCell>
                <TableCell>{purchase.supplier}</TableCell>
                <TableCell>{purchase.product_name}</TableCell>
                <TableCell>{purchase.quantity}</TableCell>
                <TableCell>${purchase.unit_price.toFixed(2)}</TableCell>
                <TableCell>${purchase.total_amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={purchase.payment_status}
                    color={getStatusColor(purchase.payment_status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{purchase.payment_method}</TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog('edit', purchase)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDeleteDialog(purchase)}
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
          {dialogMode === 'add' ? 'Add New Purchase' : 'Edit Purchase'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date"
                value={currentPurchase.date}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} />}
              />
            </LocalizationProvider>

            <TextField
              label="Supplier"
              value={currentPurchase.supplier}
              onChange={handleInputChange('supplier')}
              fullWidth
              required
            />

            <TextField
              label="Product Name"
              value={currentPurchase.product_name}
              onChange={handleInputChange('product_name')}
              fullWidth
              required
            />

            <TextField
              label="Quantity"
              type="number"
              value={currentPurchase.quantity}
              onChange={handleInputChange('quantity')}
              fullWidth
              required
            />

            <TextField
              label="Unit Price"
              type="number"
              value={currentPurchase.unit_price}
              onChange={handleInputChange('unit_price')}
              fullWidth
              required
              InputProps={{
                startAdornment: '$'
              }}
            />

            <TextField
              label="Total Amount"
              type="number"
              value={currentPurchase.total_amount}
              InputProps={{
                startAdornment: '$',
                readOnly: true
              }}
              fullWidth
              disabled
            />

            <TextField
              select
              label="Payment Status"
              value={currentPurchase.payment_status}
              onChange={handleInputChange('payment_status')}
              fullWidth
              required
            >
              {Object.values(PAYMENT_STATUSES).map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Payment Method"
              value={currentPurchase.payment_method}
              onChange={handleInputChange('payment_method')}
              fullWidth
            >
              {PAYMENT_METHODS.map((method) => (
                <MenuItem key={method} value={method}>
                  {method}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Notes"
              value={currentPurchase.notes}
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
          Are you sure you want to delete this purchase?
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

export default Purchases;

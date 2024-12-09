import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import supabase from '../supabaseClient';

// Constants for customer types
const CUSTOMER_TYPES = {
  NEW: 'new',
  OLD: 'old'
};

// Function to determine customer type based on first purchase date
const determineCustomerType = (firstPurchaseDate) => {
  if (!firstPurchaseDate) return CUSTOMER_TYPES.NEW;
  const threeMonthsAgo = dayjs().subtract(3, 'month');
  return dayjs(firstPurchaseDate).isBefore(threeMonthsAgo) ? CUSTOMER_TYPES.OLD : CUSTOMER_TYPES.NEW;
};

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState({});
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    customer_type: CUSTOMER_TYPES.NEW
  });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const theme = useTheme();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      // First, fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (customersError) throw customersError;

      // Then, fetch sales data for these customers
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*');

      if (salesError) throw salesError;

      console.log('Sales data:', salesData); // Debug log

      // Calculate purchase history for each customer
      const customersWithHistory = customersData.map(customer => {
        const customerSales = salesData.filter(sale => sale.customer_id === customer.id);
        const totalTransactions = customerSales.length;
        
        // Calculate total spent with discount
        const totalSpent = customerSales.reduce((sum, sale) => {
          // Debug logs
          console.log('Processing sale:', sale);
          console.log('Quantity:', sale.quantity);
          console.log('Unit price:', sale.unit_price);
          console.log('Discount type:', sale.discount_type);
          console.log('Discount value:', sale.discount_value);

          const subtotal = sale.quantity * sale.unit_price;
          console.log('Subtotal:', subtotal);

          let discountAmount = 0;
          if (sale.discount_type === 'percentage') {
            discountAmount = (sale.discount_value / 100) * subtotal;
          } else if (sale.discount_type === 'fixed') {
            discountAmount = sale.discount_value || 0;
          }
          console.log('Discount amount:', discountAmount);

          const finalAmount = subtotal - discountAmount;
          console.log('Final amount:', finalAmount);

          return sum + finalAmount;
        }, 0);

        console.log(`Total spent for customer ${customer.name}:`, totalSpent); // Debug log
        
        // Find first and last purchase dates
        const purchaseDates = customerSales.map(sale => new Date(sale.date).getTime());
        const firstPurchaseDate = purchaseDates.length > 0 ? new Date(Math.min(...purchaseDates)) : null;
        const lastPurchaseDate = purchaseDates.length > 0 ? new Date(Math.max(...purchaseDates)) : null;

        return {
          ...customer,
          customer_type: customer.customer_type || CUSTOMER_TYPES.NEW,
          purchase_history: {
            total_transactions: totalTransactions,
            total_spent: totalSpent,
            first_purchase_date: firstPurchaseDate?.toISOString(),
            last_purchase_date: lastPurchaseDate?.toISOString()
          }
        };
      });

      setCustomers(customersWithHistory || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Failed to fetch customers. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: newCustomer.name,
          email: newCustomer.email,
          phone: newCustomer.phone,
          location: newCustomer.location,
          customer_type: CUSTOMER_TYPES.NEW // New customers are always "new"
        }])
        .select();

      if (error) throw error;

      setCustomers([...customers, {
        ...data[0],
        purchase_history: {
          total_transactions: 0,
          total_spent: 0,
          first_purchase_date: null,
          last_purchase_date: null
        }
      }]);
      
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        location: '',
        customer_type: CUSTOMER_TYPES.NEW
      });
      setOpenNewDialog(false);
    } catch (error) {
      console.error('Error adding customer:', error.message);
    }
  };

  const handleEdit = (customer) => {
    console.log('Editing customer:', customer); // Debug log
    setEditedCustomer({ 
      id: customer.id,
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      location: customer.location || '',
      customer_type: customer.customer_type || CUSTOMER_TYPES.NEW
    });
    setOpenEditDialog(true);
  };

  const handleSave = async () => {
    try {
      // Log the data being sent
      console.log('Updating customer with ID:', editedCustomer.id);
      
      // Prepare update data including customer_type but without updated_at
      const updateData = {
        name: editedCustomer.name,
        email: editedCustomer.email,
        phone: editedCustomer.phone,
        location: editedCustomer.location,
        customer_type: editedCustomer.customer_type || CUSTOMER_TYPES.NEW
      };

      console.log('Update data:', updateData);

      // Perform the update
      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', editedCustomer.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from update');
      }

      console.log('Successfully updated customer:', data);

      // Update the customers list with the returned data
      setCustomers(prevCustomers => 
        prevCustomers.map(customer => 
          customer.id === editedCustomer.id 
            ? {
                ...customer,
                ...data,
                purchase_history: customer.purchase_history
              }
            : customer
        )
      );
      
      setOpenEditDialog(false);
      setEditedCustomer({});
    } catch (error) {
      console.error('Error updating customer:', error);
      alert(`Failed to update customer: ${error.message || 'Please try again'}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCustomers(customers.filter(customer => customer.id !== id));
    } catch (error) {
      console.error('Error deleting customer:', error.message);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (filterType === 'all') return true;
    return customer.customer_type === filterType;
  });

  useEffect(() => {
    console.log('Current editing id:', editedCustomer.id);
    console.log('Current edited customer:', editedCustomer);
  }, [editedCustomer]);

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4 
      }}>
        <Typography variant="h4">
          Customers
        </Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Filter Type</InputLabel>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            label="Filter Type"
            size="small"
          >
            <MenuItem value="all">All Customers</MenuItem>
            <MenuItem value={CUSTOMER_TYPES.NEW}>New Customers</MenuItem>
            <MenuItem value={CUSTOMER_TYPES.OLD}>Old Customers</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden', backgroundColor: 'background.paper', borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>
                  Name
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>
                  Type
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>
                  Email
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>
                  Phone
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>
                  Location
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>
                  Total Spent
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>
                  Last Purchase
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">Loading...</TableCell>
                </TableRow>
              ) : (
                filteredCustomers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={customer.customer_type === CUSTOMER_TYPES.NEW ? 'New' : 'Old'}
                          color={customer.customer_type === CUSTOMER_TYPES.NEW ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.location}</TableCell>
                      <TableCell align="right">
                        ${customer.purchase_history?.total_spent?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        {customer.purchase_history?.last_purchase_date
                          ? dayjs(customer.purchase_history.last_purchase_date).format('DD/MM/YYYY')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleEdit(customer)} size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(customer.id)} size="small">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredCustomers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenNewDialog(true)}
        >
          Add New Customer
        </Button>
      </Box>

      <Dialog 
        open={openNewDialog} 
        onClose={() => setOpenNewDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Location"
              value={newCustomer.location}
              onChange={(e) => setNewCustomer({ ...newCustomer, location: e.target.value })}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!newCustomer.name} // Disable if name is empty
          >
            Add Customer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={() => setOpenEditDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Customer</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={editedCustomer.name || ''}
              onChange={(e) => setEditedCustomer(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={editedCustomer.email || ''}
              onChange={(e) => setEditedCustomer(prev => ({ ...prev, email: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Phone"
              value={editedCustomer.phone || ''}
              onChange={(e) => setEditedCustomer(prev => ({ ...prev, phone: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Location"
              value={editedCustomer.location || ''}
              onChange={(e) => setEditedCustomer(prev => ({ ...prev, location: e.target.value }))}
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Customer Type</InputLabel>
              <Select
                value={editedCustomer.customer_type || CUSTOMER_TYPES.NEW}
                onChange={(e) => setEditedCustomer(prev => ({ ...prev, customer_type: e.target.value }))}
                label="Customer Type"
              >
                <MenuItem value={CUSTOMER_TYPES.NEW}>New</MenuItem>
                <MenuItem value={CUSTOMER_TYPES.OLD}>Old</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={!editedCustomer.name}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CustomerList;

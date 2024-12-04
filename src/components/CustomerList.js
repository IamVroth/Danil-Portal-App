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
  useTheme
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import supabase from '../supabaseClient';

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editingId, setEditingId] = useState(null);
  const [editedCustomer, setEditedCustomer] = useState({});
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    location: ''
  });
  const [loading, setLoading] = useState(true);
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

      // Calculate purchase history for each customer
      const customersWithHistory = customersData.map(customer => {
        const customerSales = salesData.filter(sale => sale.customer_id === customer.id);
        const totalTransactions = customerSales.length;
        const totalSpent = customerSales.reduce((sum, sale) => sum + (sale.quantity * sale.unit_price), 0);
        const lastPurchaseDate = customerSales.length > 0 
          ? Math.max(...customerSales.map(sale => new Date(sale.sale_date).getTime()))
          : null;

        return {
          ...customer,
          purchase_history: {
            total_transactions: totalTransactions,
            total_spent: totalSpent,
            last_purchase_date: lastPurchaseDate ? new Date(lastPurchaseDate).toISOString() : null
          }
        };
      });

      setCustomers(customersWithHistory || []);
    } catch (error) {
      console.error('Error fetching customers:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select();

      if (error) throw error;

      setCustomers([...customers, data[0]]);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        location: ''
      });
      setOpenNewDialog(false);
    } catch (error) {
      console.error('Error adding customer:', error.message);
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setEditedCustomer({ ...customer });
  };

  const handleSave = async (id) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editedCustomer.name,
          email: editedCustomer.email,
          phone: editedCustomer.phone,
          location: editedCustomer.location
        })
        .eq('id', id);

      if (error) throw error;

      setCustomers(customers.map(customer =>
        customer.id === id ? editedCustomer : customer
      ));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating customer:', error.message);
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

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 4, textAlign: 'center' }}>
        Customers
      </Typography>
      
      <Paper 
        elevation={3}
        sx={{
          width: '100%',
          overflow: 'hidden',
          backgroundColor: 'background.paper',
          borderRadius: 2,
        }}
      >
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Name
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Email
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Phone
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Location
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Total Spent
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Last Purchase
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">Loading...</TableCell>
                </TableRow>
              ) : (
                customers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        {editingId === customer.id ? (
                          <TextField
                            size="small"
                            value={editedCustomer.name}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, name: e.target.value })}
                          />
                        ) : (
                          customer.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === customer.id ? (
                          <TextField
                            size="small"
                            type="email"
                            value={editedCustomer.email}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, email: e.target.value })}
                          />
                        ) : (
                          customer.email
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === customer.id ? (
                          <TextField
                            size="small"
                            value={editedCustomer.phone}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, phone: e.target.value })}
                          />
                        ) : (
                          customer.phone
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === customer.id ? (
                          <TextField
                            size="small"
                            value={editedCustomer.location}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, location: e.target.value })}
                          />
                        ) : (
                          customer.location
                        )}
                      </TableCell>
                      <TableCell align="right">
                        ${customer.purchase_history?.total_spent?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        {customer.purchase_history?.last_purchase_date
                          ? new Date(customer.purchase_history.last_purchase_date).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {editingId === customer.id ? (
                          <>
                            <IconButton onClick={() => handleSave(customer.id)} size="small">
                              <SaveIcon />
                            </IconButton>
                            <IconButton onClick={() => setEditingId(null)} size="small">
                              <CancelIcon />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton onClick={() => handleEdit(customer)} size="small">
                              <EditIcon />
                            </IconButton>
                            <IconButton onClick={() => handleDelete(customer.id)} size="small">
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
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
          count={customers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        mb: 3,
        gap: 2,
        mt: 2
      }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenNewDialog(true)}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Add New Customer
        </Button>
      </Box>

      <Dialog 
        open={openNewDialog} 
        onClose={() => setOpenNewDialog(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={useMediaQuery(theme => theme.breakpoints.down('sm'))}
      >
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            mt: 2
          }}>
            <TextField
              fullWidth
              label="Name"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Phone"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Location"
              value={newCustomer.location}
              onChange={(e) => setNewCustomer({ ...newCustomer, location: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenNewDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CustomerList;

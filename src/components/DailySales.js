import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Alert,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import supabase from '../supabaseClient';

// Initial states for new product and customer
const initialProductState = {
  name: '',
  description: '',
  unit_price: '',
  status: 'active',
};

const initialCustomerState = {
  name: '',
  email: '',
  phone: '',
  location: '',
};

function DailySales() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saleData, setSaleData] = useState({
    date: dayjs(),
    customer_id: '',
    product_id: '',
    quantity: '',
    unit_price: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [editedSale, setEditedSale] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // New states for quick-add dialogs
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [openCustomerDialog, setOpenCustomerDialog] = useState(false);
  const [newProduct, setNewProduct] = useState(initialProductState);
  const [newCustomer, setNewCustomer] = useState(initialCustomerState);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const theme = useTheme();

  useEffect(() => {
    fetchSales();
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers(name),
          products(name, unit_price)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, unit_price')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Insert the new sale
      const { data: newSale, error: insertError } = await supabase
        .from('sales')
        .insert([{
          date: saleData.date.format('YYYY-MM-DD'),
          customer_id: saleData.customer_id,
          product_id: saleData.product_id,
          quantity: Number(saleData.quantity),
          unit_price: Number(saleData.unit_price),
          payment_status: 'paid'
        }])
        .select();

      if (insertError) throw insertError;

      // Fetch the complete sale data with customer and product information
      const { data: completeData, error: fetchError } = await supabase
        .from('sales')
        .select(`
          *,
          customers(name),
          products(name, unit_price)
        `)
        .eq('id', newSale[0].id)
        .single();

      if (fetchError) throw fetchError;
      
      // Add the complete sale data to the list
      setSales([completeData, ...sales]);
      
      // Reset the form
      setSaleData({
        date: dayjs(),
        customer_id: '',
        product_id: '',
        quantity: '',
        unit_price: '',
      });
      setOpenNewDialog(false);
    } catch (error) {
      console.error('Error adding sale:', error.message);
    }
  };

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    setSaleData({
      ...saleData,
      product_id: productId,
      unit_price: product ? product.unit_price : ''
    });
  };

  // Quick-add product handlers
  const handleOpenProductDialog = () => {
    setOpenProductDialog(true);
  };

  const handleCloseProductDialog = () => {
    setOpenProductDialog(false);
    setNewProduct(initialProductState);
  };

  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...newProduct,
          unit_price: parseFloat(newProduct.unit_price)
        }])
        .select();

      if (error) throw error;

      // Update products list and select the new product
      await fetchProducts();
      setSaleData(prev => ({
        ...prev,
        product_id: data[0].id,
        unit_price: data[0].unit_price
      }));

      handleCloseProductDialog();
      showSnackbar('Product added successfully');
    } catch (error) {
      showSnackbar(error.message, 'error');
    }
  };

  // Quick-add customer handlers
  const handleOpenCustomerDialog = () => {
    setOpenCustomerDialog(true);
  };

  const handleCloseCustomerDialog = () => {
    setOpenCustomerDialog(false);
    setNewCustomer(initialCustomerState);
  };

  const handleCustomerInputChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select();

      if (error) throw error;

      // Update customers list and select the new customer
      await fetchCustomers();
      setSaleData(prev => ({
        ...prev,
        customer_id: data[0].id
      }));

      handleCloseCustomerDialog();
      showSnackbar('Customer added successfully');
    } catch (error) {
      showSnackbar(error.message, 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleEdit = (sale) => {
    setEditingId(sale.id);
    setEditedSale({
      ...sale,
      date: dayjs(sale.date),
    });
  };

  const handleSave = async (id) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          date: editedSale.date.format('YYYY-MM-DD'),
          customer_id: editedSale.customer_id,
          product_id: editedSale.product_id,
          quantity: Number(editedSale.quantity),
          unit_price: Number(editedSale.unit_price),
        })
        .eq('id', id);

      if (error) throw error;
      
      setEditingId(null);
      fetchSales(); // Refresh the list to get the computed total_amount
    } catch (error) {
      console.error('Error updating sale:', error.message);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedSale({});
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSales(sales.filter(sale => sale.id !== id));
    } catch (error) {
      console.error('Error deleting sale:', error.message);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 4, textAlign: 'center' }}>
        Daily Sales
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
                  Date
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Customer
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Product
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Quantity
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Unit Price
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}>
                  Total
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
                sales
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((sale) => (
                    <TableRow key={sale.id} hover>
                      <TableCell>
                        {editingId === sale.id ? (
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                              value={editedSale.date}
                              onChange={(newValue) => setEditedSale({ ...editedSale, date: newValue })}
                              renderInput={(params) => <TextField {...params} size="small" />}
                            />
                          </LocalizationProvider>
                        ) : (
                          dayjs(sale.date).format('YYYY-MM-DD')
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === sale.id ? (
                          <TextField
                            select
                            size="small"
                            value={editedSale.customer_id}
                            onChange={(e) => setEditedSale({ ...editedSale, customer_id: e.target.value })}
                          >
                            {customers.map((customer) => (
                              <MenuItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          sale.customers.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === sale.id ? (
                          <TextField
                            select
                            size="small"
                            value={editedSale.product_id}
                            onChange={(e) => setEditedSale({ ...editedSale, product_id: e.target.value })}
                          >
                            {products.map((product) => (
                              <MenuItem key={product.id} value={product.id}>
                                {product.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          sale.products.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === sale.id ? (
                          <TextField
                            size="small"
                            type="number"
                            value={editedSale.quantity}
                            onChange={(e) => setEditedSale({ ...editedSale, quantity: e.target.value })}
                          />
                        ) : (
                          sale.quantity
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === sale.id ? (
                          <TextField
                            size="small"
                            type="number"
                            value={editedSale.unit_price}
                            onChange={(e) => setEditedSale({ ...editedSale, unit_price: e.target.value })}
                          />
                        ) : (
                          `$${sale.unit_price}`
                        )}
                      </TableCell>
                      <TableCell>${sale.total_amount}</TableCell>
                      <TableCell>
                        {editingId === sale.id ? (
                          <>
                            <IconButton onClick={() => handleSave(sale.id)} size="small">
                              <SaveIcon />
                            </IconButton>
                            <IconButton onClick={handleCancel} size="small">
                              <CancelIcon />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton onClick={() => handleEdit(sale)} size="small">
                              <EditIcon />
                            </IconButton>
                            <IconButton onClick={() => handleDelete(sale.id)} size="small">
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
          component="div"
          count={sales.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpenNewDialog(true)}
        sx={{ width: '100%', maxWidth: 1200, mx: 'auto', mt: 2 }}
      >
        Add New Sale
      </Button>

      <Dialog 
        open={openNewDialog} 
        onClose={() => setOpenNewDialog(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={useMediaQuery(theme => theme.breakpoints.down('sm'))}
      >
        <DialogTitle>Add New Sale</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            mt: 2
          }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Date"
                    value={saleData.date}
                    onChange={(newValue) => setSaleData({ ...saleData, date: newValue })}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Customer</InputLabel>
                    <Select
                      value={saleData.customer_id}
                      onChange={(e) => setSaleData({ ...saleData, customer_id: e.target.value })}
                      label="Customer"
                    >
                      {customers.map((customer) => (
                        <MenuItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    onClick={handleOpenCustomerDialog}
                    sx={{ minWidth: 'auto' }}
                  >
                    <AddIcon />
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Product</InputLabel>
                    <Select
                      value={saleData.product_id}
                      onChange={(e) => handleProductChange(e.target.value)}
                      label="Product"
                    >
                      {products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name} - ${product.unit_price}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    onClick={handleOpenProductDialog}
                    sx={{ minWidth: 'auto' }}
                  >
                    <AddIcon />
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={saleData.quantity}
                  onChange={(e) => setSaleData({ ...saleData, quantity: e.target.value })}
                  inputProps={{ min: "1" }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Unit Price"
                  type="number"
                  value={saleData.unit_price}
                  onChange={(e) => setSaleData({ ...saleData, unit_price: e.target.value })}
                  inputProps={{ step: "0.01", min: "0" }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenNewDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openProductDialog} 
        onClose={handleCloseProductDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add New Product</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleAddProduct} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={newProduct.name}
              onChange={handleProductInputChange}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={newProduct.description}
              onChange={handleProductInputChange}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Unit Price"
              name="unit_price"
              type="number"
              value={newProduct.unit_price}
              onChange={handleProductInputChange}
              required
              inputProps={{ step: "0.01", min: "0" }}
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProductDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleAddProduct}>Add Product</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openCustomerDialog} 
        onClose={handleCloseCustomerDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleAddCustomer} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={newCustomer.name}
              onChange={handleCustomerInputChange}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={newCustomer.email}
              onChange={handleCustomerInputChange}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={newCustomer.phone}
              onChange={handleCustomerInputChange}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Location"
              name="location"
              value={newCustomer.location}
              onChange={handleCustomerInputChange}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCustomerDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleAddCustomer}>Add Customer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default DailySales;

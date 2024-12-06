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
  Chip,
  Divider,
  InputAdornment,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import CloseIcon from '@mui/icons-material/Close';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import dayjs from 'dayjs';
import supabase from '../supabaseClient';
import SaleDetailView from './SaleDetailView';

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

// Add delivery status constants
const DELIVERY_STATUSES = {
  PENDING: 'pending',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RETURNED: 'returned'
};

// Add discount type constants
const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed'
};

// Update initial sale data
const initialSaleData = {
  date: dayjs(),
  customer_id: '',
  product_id: '',
  quantity: '',
  unit_price: '',
  has_delivery: false,
  delivery_charge: 0,
  delivery_cost: 0,
  is_promotional: false,
  delivery_status: DELIVERY_STATUSES.PENDING,
  delivery_notes: '',
  delivery_company: '',
  delivery_updated_at: null,
  discount_type: null,
  discount_value: 0,
  payment_status: 'paid'
};

function DailySales() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [deliveryCompanies, setDeliveryCompanies] = useState([]);
  const [saleData, setSaleData] = useState(initialSaleData);
  const [editingId, setEditingId] = useState(null);
  const [editedSale, setEditedSale] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Add filter states
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().startOf('month'),
    endDate: dayjs(),
  });
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locations, setLocations] = useState([]);
  
  // Add states for quick date filters
  const [quickDateFilter, setQuickDateFilter] = useState('thisMonth');
  
  // Quick-add dialogs state
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [openCustomerDialog, setOpenCustomerDialog] = useState(false);
  const [newProduct, setNewProduct] = useState(initialProductState);
  const [newCustomer, setNewCustomer] = useState(initialCustomerState);
  
  // Delivery status dialog state
  const [statusUpdateDialog, setStatusUpdateDialog] = useState({
    open: false,
    saleId: null,
    status: '',
    notes: ''
  });
  
  // Add new state for details dialog
  const [detailsDialog, setDetailsDialog] = useState({
    open: false,
    sale: null
  });
  
  const [selectedSale, setSelectedSale] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchSales();
    fetchCustomers();
    fetchProducts();
    fetchDeliveryCompanies();
    fetchLocations();
  }, []);

  // Add function to fetch unique locations
  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('location')
        .not('location', 'eq', '')
        .not('location', 'is', null);

      if (error) throw error;

      // Get unique locations
      const uniqueLocations = [...new Set(data.map(item => item.location))].sort();
      setLocations(uniqueLocations);
    } catch (error) {
      console.error('Error fetching locations:', error.message);
    }
  };

  const fetchSales = async () => {
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          customers!inner (
            id,
            name,
            location
          ),
          products!inner (
            id,
            name,
            unit_price
          )
        `)
        .gte('date', dateRange.startDate.format('YYYY-MM-DD'))
        .lte('date', dateRange.endDate.format('YYYY-MM-DD'))
        .order('date', { ascending: false });

      if (selectedLocation) {
        // First get customer IDs for the selected location
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('location', selectedLocation);

        if (customerError) throw customerError;

        if (customerData && customerData.length > 0) {
          const customerIds = customerData.map(c => c.id);
          query = query.in('customer_id', customerIds);
        } else {
          // If no customers found for location, return empty result
          setSales([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to handle relationships correctly
      const transformedData = (data || []).map(sale => ({
        ...sale,
        customer: sale.customers || { name: 'Unknown Customer', location: 'Unknown Location' },
        product: sale.products || { name: 'Unknown Product', unit_price: 0 }
      }));

      setSales(transformedData);
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

  const fetchDeliveryCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_companies')
        .select('*')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      setDeliveryCompanies(data || []);
    } catch (error) {
      console.error('Error fetching delivery companies:', error.message);
    }
  };

  // Add function to handle quick date filters
  const handleQuickDateFilter = (filter) => {
    const today = dayjs();
    let startDate, endDate;

    switch (filter) {
      case 'today':
        startDate = today.startOf('day');
        endDate = today.endOf('day');
        break;
      case 'yesterday':
        startDate = today.subtract(1, 'day').startOf('day');
        endDate = today.subtract(1, 'day').endOf('day');
        break;
      case 'thisWeek':
        startDate = today.startOf('week');
        endDate = today;
        break;
      case 'thisMonth':
        startDate = today.startOf('month');
        endDate = today;
        break;
      case 'lastMonth':
        startDate = today.subtract(1, 'month').startOf('month');
        endDate = today.subtract(1, 'month').endOf('month');
        break;
      default:
        return;
    }

    setQuickDateFilter(filter);
    setDateRange({ startDate, endDate });
  };

  // Add effect to refetch sales when filters change
  useEffect(() => {
    fetchSales();
  }, [dateRange.startDate, dateRange.endDate, selectedLocation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting form...', saleData); // Debug log
    
    try {
      if (!saleData.customer_id || !saleData.product_id || !saleData.quantity || !saleData.unit_price) {
        showSnackbar('Please fill in all required fields', 'error');
        return;
      }

      const now = new Date().toISOString();
      const subtotal = Number(saleData.quantity) * Number(saleData.unit_price);
      
      // Calculate discount
      let discountAmount = 0;
      if (saleData.discount_type === DISCOUNT_TYPES.PERCENTAGE) {
        discountAmount = (subtotal * Number(saleData.discount_value)) / 100;
      } else if (saleData.discount_type === DISCOUNT_TYPES.FIXED) {
        discountAmount = Number(saleData.discount_value);
      }

      // Calculate delivery charge
      const deliveryCharge = saleData.is_promotional ? 0 : Number(saleData.delivery_charge);
      
      // Calculate final total
      const total = subtotal - discountAmount + deliveryCharge;

      console.log('Inserting sale with data:', {
        date: saleData.date.format('YYYY-MM-DD'),
        customer_id: saleData.customer_id,
        product_id: saleData.product_id,
        quantity: Number(saleData.quantity),
        unit_price: Number(saleData.unit_price),
        has_delivery: saleData.has_delivery,
        delivery_charge: deliveryCharge,
        delivery_cost: saleData.has_delivery ? Number(saleData.delivery_cost) : 0,
        is_promotional: saleData.is_promotional,
        delivery_status: saleData.has_delivery ? DELIVERY_STATUSES.PENDING : null,
        delivery_notes: saleData.delivery_notes || null,
        delivery_company: saleData.has_delivery ? saleData.delivery_company : null,
        delivery_updated_at: saleData.has_delivery ? now : null,
        discount_type: saleData.discount_type,
        discount_value: Number(saleData.discount_value),
        payment_status: 'paid'
      }); // Debug log

      // Insert the new sale
      const { data: newSale, error: insertError } = await supabase
        .from('sales')
        .insert([{
          date: saleData.date.format('YYYY-MM-DD'),
          customer_id: saleData.customer_id,
          product_id: saleData.product_id,
          quantity: Number(saleData.quantity),
          unit_price: Number(saleData.unit_price),
          has_delivery: saleData.has_delivery,
          delivery_charge: deliveryCharge,
          delivery_cost: saleData.has_delivery ? Number(saleData.delivery_cost) : 0,
          is_promotional: saleData.is_promotional,
          delivery_status: saleData.has_delivery ? DELIVERY_STATUSES.PENDING : null,
          delivery_notes: saleData.delivery_notes || null,
          delivery_company: saleData.has_delivery ? saleData.delivery_company : null,
          delivery_updated_at: saleData.has_delivery ? now : null,
          discount_type: saleData.discount_type || null,
          discount_value: saleData.discount_type ? Number(saleData.discount_value) : 0,
          payment_status: 'paid'
        }])
        .select();

      if (insertError) {
        console.error('Insert error:', insertError); // Debug log
        throw insertError;
      }

      console.log('Sale inserted successfully:', newSale); // Debug log

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

      if (fetchError) {
        console.error('Fetch error:', fetchError); // Debug log
        throw fetchError;
      }

      console.log('Complete sale data fetched:', completeData); // Debug log
      
      // Add the complete sale data to the list
      setSales([completeData, ...sales]);
      
      // Reset the form and close dialog
      setSaleData(initialSaleData);
      setOpenNewDialog(false);
      
      // Show success message
      showSnackbar('Sale added successfully', 'success');
    } catch (error) {
      console.error('Error adding sale:', error); // Debug log
      showSnackbar(error.message, 'error');
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

  // Add delivery status update handler
  const handleUpdateDeliveryStatus = async (saleId, newStatus, notes = '') => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('sales')
        .update({ 
          delivery_status: newStatus,
          delivery_notes: notes,
          delivery_updated_at: now
        })
        .eq('id', saleId);

      if (error) throw error;

      // Update local state
      setSales(sales.map(sale => 
        sale.id === saleId 
          ? { 
              ...sale, 
              delivery_status: newStatus, 
              delivery_notes: notes,
              delivery_updated_at: now
            } 
          : sale
      ));

      showSnackbar(`Delivery status updated to ${newStatus}`);
    } catch (error) {
      showSnackbar(error.message, 'error');
    }
  };

  // Add dialog handlers
  const openStatusUpdateDialog = (sale) => {
    setStatusUpdateDialog({
      open: true,
      saleId: sale.id,
      status: sale.delivery_status,
      notes: sale.delivery_notes || ''
    });
  };

  const closeStatusUpdateDialog = () => {
    setStatusUpdateDialog({
      open: false,
      saleId: null,
      status: '',
      notes: ''
    });
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
      customer_id: sale.customer_id,
      product_id: sale.product_id,
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      delivery_charge: sale.delivery_charge || 0,
      delivery_cost: sale.delivery_cost || 0,
      delivery_status: sale.delivery_status || DELIVERY_STATUSES.PENDING,
      delivery_notes: sale.delivery_notes || '',
      delivery_company: sale.delivery_company || '',
      discount_type: sale.discount_type || null,
      discount_value: sale.discount_value || 0,
      payment_status: sale.payment_status || 'paid'
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedSale({});
  };

  const handleFieldChange = (field, value) => {
    setEditedSale(prev => ({
      ...prev,
      [field]: value
    }));
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

  // Add function to handle row click
  const handleRowClick = (sale) => {
    if (isMobile) {
      setSelectedSale(sale);
    } else {
      setDetailsDialog({
        open: true,
        sale
      });
    }
  };

  const handleBackFromDetail = () => {
    setSelectedSale(null);
  };

  const handleCloseDetails = () => {
    setDetailsDialog({
      open: false,
      sale: null
    });
  };

  // Add delivery status color helper function
  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case DELIVERY_STATUSES.PENDING:
        return 'warning';
      case DELIVERY_STATUSES.IN_TRANSIT:
        return 'info';
      case DELIVERY_STATUSES.DELIVERED:
        return 'success';
      case DELIVERY_STATUSES.FAILED:
        return 'error';
      case DELIVERY_STATUSES.RETURNED:
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Mobile list item component
  const MobileListItem = ({ sale }) => {
    const total = (sale.quantity * sale.unit_price) - (sale.discount_value || 0);
    
    return (
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary">
            Date: {dayjs(sale.date).format('YYYY-MM-DD')}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight="bold">
            {sale.customer?.name}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Product
          </Typography>
          <Typography variant="body1" noWrap>
            {sale.product?.name}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Total
          </Typography>
          <Typography variant="body1" fontWeight="bold" color="primary">
            ${(sale.total || 0).toFixed(2)}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
              }}>
                <PhoneIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2" noWrap>
                  {sale.customer?.phone || 'N/A'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
              }}>
                <LocationOnIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2" noWrap>
                  {sale.customer?.location || 'N/A'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    );
  };

  const filteredSales = sales.filter(sale => {
    if (selectedLocation && sale.customer?.location !== selectedLocation) {
      return false;
    }
    return true;
  });

  if (isMobile && selectedSale) {
    return (
      <SaleDetailView
        sale={selectedSale}
        onBack={handleBackFromDetail}
        onEdit={handleEdit}
        getDeliveryStatusColor={getDeliveryStatusColor}
      />
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {isMobile ? (
        // Mobile View
        <Box sx={{ 
          width: '100vw',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          backgroundColor: 'background.default',
          pt: '64px', // Height of the app bar
          pb: 2,
          overflowY: 'auto'
        }}>
          <Box sx={{
            width: '90vw',
            maxWidth: '600px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                my: 2, 
                textAlign: 'center',
                fontSize: 'calc(20px + 1vw)',
                fontWeight: 'bold'
              }}
            >
              Daily Sales
            </Typography>

            {/* Action Buttons Container */}
            <Box sx={{ 
              display: 'flex', 
              gap: '3vw', 
              justifyContent: 'center',
              width: '100%',
              mb: 3
            }}>
              <IconButton
                sx={{
                  width: 'calc(60px + 5vw)',
                  height: 'calc(60px + 5vw)',
                  borderRadius: '12px',
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
                onClick={() => setOpenNewDialog(true)}
              >
                <AddIcon sx={{ fontSize: 'calc(24px + 2vw)' }} />
              </IconButton>
              <IconButton
                sx={{
                  width: 'calc(60px + 5vw)',
                  height: 'calc(60px + 5vw)',
                  borderRadius: '12px',
                  backgroundColor: 'secondary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'secondary.dark',
                  },
                }}
                onClick={handleOpenCustomerDialog}
              >
                <PersonAddIcon sx={{ fontSize: 'calc(24px + 2vw)' }} />
              </IconButton>
              <IconButton
                sx={{
                  width: 'calc(60px + 5vw)',
                  height: 'calc(60px + 5vw)',
                  borderRadius: '12px',
                  backgroundColor: 'info.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'info.dark',
                  },
                }}
                onClick={handleOpenProductDialog}
              >
                <AddBusinessIcon sx={{ fontSize: 'calc(24px + 2vw)' }} />
              </IconButton>
            </Box>

            {/* Filters Container */}
            <Box sx={{ 
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mb: 3
            }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ fontSize: 'calc(14px + 0.5vw)' }}>Location</InputLabel>
                <Select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  label="Location"
                  sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                >
                  <MenuItem value="">All Locations</MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location} value={location}>
                      {location}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography 
                    variant="caption" 
                    color="primary"
                    sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                  >
                    Quick Filter
                  </Typography>
                </Box>
                <Select
                  value={quickDateFilter}
                  onChange={(e) => handleQuickDateFilter(e.target.value)}
                  sx={{ 
                    width: '100%',
                    fontSize: 'calc(14px + 0.5vw)'
                  }}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="yesterday">Yesterday</MenuItem>
                  <MenuItem value="thisWeek">This Week</MenuItem>
                  <MenuItem value="thisMonth">This Month</MenuItem>
                  <MenuItem value="lastMonth">Last Month</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Sales List Container */}
            <Box sx={{ 
              width: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              {filteredSales.length > 0 ? (
                filteredSales
                  .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
                  .map((sale) => (
                    <Paper
                      key={sale.id}
                      elevation={1}
                      sx={{
                        p: '4vw',
                        width: '100%',
                        backgroundColor: 'background.paper',
                        cursor: 'pointer',
                        borderRadius: 2,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                      onClick={() => handleRowClick(sale)}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography 
                            variant="subtitle2" 
                            color="text.secondary"
                            sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                          >
                            Date: {dayjs(sale.date).format('YYYY-MM-DD')}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography 
                            variant="subtitle1" 
                            fontWeight="bold"
                            sx={{ fontSize: 'calc(16px + 0.5vw)' }}
                          >
                            {sale.customer?.name}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                          >
                            Product
                          </Typography>
                          <Typography 
                            variant="body1" 
                            noWrap
                            sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                          >
                            {sale.product?.name}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                          >
                            Total
                          </Typography>
                          <Typography 
                            variant="body1" 
                            fontWeight="bold" 
                            color="primary"
                            sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                          >
                            ${(sale.total || 0).toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: 1,
                                color: 'text.secondary',
                              }}>
                                <PhoneIcon sx={{ fontSize: 'calc(16px + 0.5vw)' }} />
                                <Typography 
                                  variant="body2" 
                                  noWrap
                                  sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                                >
                                  {sale.customer?.phone || 'N/A'}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: 1,
                                color: 'text.secondary',
                              }}>
                                <LocationOnIcon sx={{ fontSize: 'calc(16px + 0.5vw)' }} />
                                <Typography 
                                  variant="body2" 
                                  noWrap
                                  sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                                >
                                  {sale.customer?.location || 'N/A'}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))
              ) : (
                <Paper
                  elevation={1}
                  sx={{
                    p: '4vw',
                    width: '100%',
                    backgroundColor: 'background.paper',
                    textAlign: 'center',
                    borderRadius: 2
                  }}
                >
                  <Typography 
                    color="text.secondary"
                    sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                  >
                    No sales found
                  </Typography>
                </Paper>
              )}
            </Box>

            {/* Pagination Controls */}
            <Box sx={{ 
              width: '100%',
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
              mt: 3,
              mb: 2
            }}>
              <TablePagination
                component="div"
                count={filteredSales.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                sx={{
                  '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                    [theme.breakpoints.down('sm')]: {
                      display: 'none',
                    },
                  },
                  '.MuiTablePagination-select': {
                    fontSize: 'calc(14px + 0.5vw)'
                  }
                }}
              />
            </Box>
          </Box>
        </Box>
      ) : (
        // Desktop view content
        <Box sx={{ p: 3 }}>
          {/* Header section with responsive layout */}
          <Box sx={{ mb: 3 }}>
            {/* Title */}
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 2, 
                textAlign: 'left',
                fontWeight: 'bold'
              }}
            >
              Daily Sales
            </Typography>

            {/* Action Buttons */}
            <Grid container spacing={2} direction="row">
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<AddIcon />}
                  onClick={() => setOpenNewDialog(true)}
                >
                  Add New Sale
                </Button>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  startIcon={<PersonAddIcon />}
                  onClick={handleOpenCustomerDialog}
                >
                  Add New Customer
                </Button>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  color="info"
                  fullWidth
                  startIcon={<AddBusinessIcon />}
                  onClick={handleOpenProductDialog}
                >
                  Add New Product
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Filter section */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Start Date"
                    value={dateRange.startDate}
                    onChange={(newValue) => {
                      setDateRange(prev => ({
                        ...prev,
                        startDate: newValue
                      }));
                      setQuickDateFilter('custom');
                    }}
                    renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="End Date"
                    value={dateRange.endDate}
                    onChange={(newValue) => {
                      setDateRange(prev => ({
                        ...prev,
                        endDate: newValue
                      }));
                      setQuickDateFilter('custom');
                    }}
                    renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    label="Location"
                  >
                    <MenuItem value="">All Locations</MenuItem>
                    {locations.map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Quick Filter</InputLabel>
                  <Select
                    value={quickDateFilter}
                    onChange={(e) => handleQuickDateFilter(e.target.value)}
                    label="Quick Filter"
                  >
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="yesterday">Yesterday</MenuItem>
                    <MenuItem value="thisWeek">This Week</MenuItem>
                    <MenuItem value="thisMonth">This Month</MenuItem>
                    <MenuItem value="lastMonth">Last Month</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Desktop Table View */}
          <TableContainer component={Paper} sx={{ mt: 2 }}>
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
                    Discount
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold',
                    backgroundColor: 'background.paper',
                  }}>
                    Delivery Info
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold',
                    backgroundColor: 'background.paper',
                  }}>
                    Status
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
                    <TableCell colSpan={10} align="center">Loading...</TableCell>
                  </TableRow>
                ) : (
                  filteredSales
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((sale) => {
                      const subtotal = sale.quantity * sale.unit_price;
                      const discountAmount = sale.discount_type === DISCOUNT_TYPES.PERCENTAGE
                        ? (subtotal * sale.discount_value / 100)
                        : (sale.discount_value || 0);
                      const total = subtotal - discountAmount + (sale.is_promotional ? 0 : sale.delivery_charge);
                      
                      return (
                        <TableRow 
                          key={sale.id}
                          onClick={() => handleRowClick(sale)}
                          sx={{ 
                            cursor: editingId === sale.id ? 'default' : 'pointer',
                            '&:hover': {
                              backgroundColor: editingId === sale.id ? 'inherit' : 'rgba(0, 0, 0, 0.04)'
                            }
                          }}
                        >
                          <TableCell>
                            {editingId === sale.id ? (
                              <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                  value={editedSale.date}
                                  onChange={(newValue) => handleFieldChange('date', newValue)}
                                  renderInput={(params) => <TextField {...params} size="small" />}
                                />
                              </LocalizationProvider>
                            ) : (
                              dayjs(sale.date).format('YYYY-MM-DD')
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === sale.id ? (
                              <FormControl fullWidth size="small">
                                <Select
                                  value={editedSale.customer_id}
                                  onChange={(e) => handleFieldChange('customer_id', e.target.value)}
                                >
                                  {customers.map((customer) => (
                                    <MenuItem key={customer.id} value={customer.id}>
                                      {customer.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : (
                              sale.customer?.name
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === sale.id ? (
                              <FormControl fullWidth size="small">
                                <Select
                                  value={editedSale.product_id}
                                  onChange={(e) => handleFieldChange('product_id', e.target.value)}
                                >
                                  {products.map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                      {product.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : (
                              sale.product?.name
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === sale.id ? (
                              <TextField
                                type="number"
                                size="small"
                                value={editedSale.quantity}
                                onChange={(e) => handleFieldChange('quantity', e.target.value)}
                              />
                            ) : (
                              sale.quantity
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === sale.id ? (
                              <TextField
                                type="number"
                                size="small"
                                value={editedSale.unit_price}
                                onChange={(e) => handleFieldChange('unit_price', e.target.value)}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                }}
                              />
                            ) : (
                              `$${sale.unit_price}`
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {sale.discount_type ? (
                              <Typography>
                                {sale.discount_type === DISCOUNT_TYPES.PERCENTAGE
                                  ? `${sale.discount_value}%`
                                  : `$${sale.discount_value}`}
                                <Typography variant="caption" color="error.main" display="block">
                                  (-${discountAmount.toFixed(2)})
                                </Typography>
                              </Typography>
                            ) : (
                              'No Discount'
                            )}
                          </TableCell>
                          <TableCell>
                            {sale.has_delivery ? (
                              <Box>
                                <Typography>
                                  {sale.is_promotional ? 'Free Delivery' : `$${sale.delivery_charge}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Cost: ${sale.delivery_cost}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Company: {sale.delivery_company}
                                </Typography>
                              </Box>
                            ) : (
                              'No Delivery'
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={sale.delivery_status} 
                              size="small"
                              color={getDeliveryStatusColor(sale.delivery_status)}
                              onClick={(e) => {
                                e.stopPropagation();
                                openStatusUpdateDialog(sale);
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">${(total || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            {editingId === sale.id ? (
                              <>
                                <IconButton onClick={(e) => {
                                  e.stopPropagation();
                                  handleSave(sale.id);
                                }} size="small">
                                  <SaveIcon />
                                </IconButton>
                                <IconButton onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancel();
                                }} size="small">
                                  <CancelIcon />
                                </IconButton>
                              </>
                            ) : (
                              <>
                                <IconButton onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(sale);
                                }} size="small">
                                  <EditIcon />
                                </IconButton>
                                <IconButton onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(sale.id);
                                }} size="small">
                                  <DeleteIcon />
                                </IconButton>
                                {sale.has_delivery && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openStatusUpdateDialog(sale);
                                    }}
                                  >
                                    <LocalShippingIcon />
                                  </IconButton>
                                )}
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredSales.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                [theme.breakpoints.down('sm')]: {
                  display: 'none',
                },
              },
            }}
          />
        </Box>
      )}

      {/* Dialogs */}
      <Dialog 
        open={openNewDialog} 
        onClose={() => setOpenNewDialog(false)}
        fullWidth
        maxWidth="md"
        keepMounted={false}
        disablePortal
      >
        <form onSubmit={handleSubmit} noValidate>
          <DialogTitle>Add New Sale</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
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
                {/* Add delivery section */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Delivery Information</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Delivery Required</InputLabel>
                    <Select
                      value={saleData.has_delivery}
                      onChange={(e) => setSaleData(prev => ({ 
                        ...prev, 
                        has_delivery: e.target.value,
                        delivery_charge: e.target.value ? prev.delivery_charge : 0,
                        delivery_cost: e.target.value ? prev.delivery_cost : 0,
                        is_promotional: e.target.value ? prev.is_promotional : false,
                        delivery_status: e.target.value ? DELIVERY_STATUSES.PENDING : null
                      }))}
                      label="Delivery Required"
                    >
                      <MenuItem value={false}>No Delivery</MenuItem>
                      <MenuItem value={true}>With Delivery</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {saleData.has_delivery && (
                  <>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Delivery Company</InputLabel>
                        <Select
                          value={saleData.delivery_company || ''}
                          onChange={(e) => setSaleData(prev => ({ 
                            ...prev, 
                            delivery_company: e.target.value
                          }))}
                          label="Delivery Company"
                          required
                        >
                          {deliveryCompanies.map((company) => (
                            <MenuItem key={company.id} value={company.id}>
                              {company.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Delivery Type</InputLabel>
                        <Select
                          value={saleData.is_promotional}
                          onChange={(e) => setSaleData(prev => ({ 
                            ...prev, 
                            is_promotional: e.target.value,
                            delivery_charge: e.target.value ? 0 : prev.delivery_cost
                          }))}
                          label="Delivery Type"
                        >
                          <MenuItem value={false}>Regular Delivery</MenuItem>
                          <MenuItem value={true}>Free Delivery (Promotional)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Delivery Cost (Business)"
                        type="number"
                        value={saleData.delivery_cost}
                        onChange={(e) => setSaleData(prev => ({ 
                          ...prev, 
                          delivery_cost: e.target.value,
                          delivery_charge: prev.is_promotional ? 0 : e.target.value
                        }))}
                        InputProps={{
                          inputProps: { min: 0, step: 0.01 }
                        }}
                      />
                    </Grid>

                    {!saleData.is_promotional && (
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Delivery Charge (Customer)"
                          type="number"
                          value={saleData.delivery_charge}
                          onChange={(e) => setSaleData(prev => ({ 
                            ...prev, 
                            delivery_charge: e.target.value 
                          }))}
                          InputProps={{
                            inputProps: { min: 0, step: 0.01 }
                          }}
                        />
                      </Grid>
                    )}
                  </>
                )}
                {/* Add discount section */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Discount Information</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Discount Type</InputLabel>
                    <Select
                      value={saleData.discount_type || ''}
                      onChange={(e) => setSaleData(prev => ({ 
                        ...prev, 
                        discount_type: e.target.value,
                        discount_value: e.target.value ? prev.discount_value : 0
                      }))}
                      label="Discount Type"
                    >
                      <MenuItem value="">No Discount</MenuItem>
                      <MenuItem value={DISCOUNT_TYPES.PERCENTAGE}>Percentage (%)</MenuItem>
                      <MenuItem value={DISCOUNT_TYPES.FIXED}>Fixed Amount ($)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {saleData.discount_type && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={saleData.discount_type === DISCOUNT_TYPES.PERCENTAGE ? 'Discount Percentage' : 'Discount Amount'}
                      type="number"
                      value={saleData.discount_value}
                      onChange={(e) => setSaleData(prev => ({ 
                        ...prev, 
                        discount_value: e.target.value 
                      }))}
                      InputProps={{
                        inputProps: { 
                          min: 0,
                          max: saleData.discount_type === DISCOUNT_TYPES.PERCENTAGE ? 100 : undefined,
                          step: "0.01"
                        },
                        endAdornment: (
                          <InputAdornment position="end">
                            {saleData.discount_type === DISCOUNT_TYPES.PERCENTAGE ? '%' : '$'}
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                )}
                {/* Add price summary section */}
                {(saleData.quantity && saleData.unit_price) && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom>Price Summary</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography>Subtotal:</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography align="right">
                          ${((Number(saleData.quantity) * Number(saleData.unit_price)) || 0).toFixed(2)}
                        </Typography>
                      </Grid>

                      {saleData.discount_type && (
                        <>
                          <Grid item xs={6}>
                            <Typography color="error">
                              Discount ({saleData.discount_type === DISCOUNT_TYPES.PERCENTAGE 
                                ? `${saleData.discount_value}%`
                                : `$${saleData.discount_value}`}):
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography align="right" color="error">
                              -${((saleData.discount_type === DISCOUNT_TYPES.PERCENTAGE
                                ? (Number(saleData.quantity) * Number(saleData.unit_price) * Number(saleData.discount_value) / 100)
                                : Number(saleData.discount_value)) || 0).toFixed(2)}
                            </Typography>
                          </Grid>
                        </>
                      )}

                      {saleData.has_delivery && (
                        <>
                          <Grid item xs={6}>
                            <Typography>
                              Delivery {saleData.is_promotional && '(Free)'}:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography align="right">
                              ${((saleData.is_promotional ? 0 : Number(saleData.delivery_charge)) || 0).toFixed(2)}
                            </Typography>
                          </Grid>
                        </>
                      )}

                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                      </Grid>

                      <Grid item xs={6}>
                        <Typography variant="h6">Total:</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="h6" align="right">
                          ${(((Number(saleData.quantity) * Number(saleData.unit_price)) -
                            (saleData.discount_type === DISCOUNT_TYPES.PERCENTAGE
                              ? (Number(saleData.quantity) * Number(saleData.unit_price) * Number(saleData.discount_value) / 100)
                              : Number(saleData.discount_value)) +
                            (saleData.has_delivery && !saleData.is_promotional ? Number(saleData.delivery_charge) : 0)) || 0).toFixed(2)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={() => setOpenNewDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Add Quick-Add Product Dialog */}
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

      {/* Add Quick-Add Customer Dialog */}
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

      <Dialog 
        open={statusUpdateDialog.open} 
        onClose={closeStatusUpdateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Delivery Status</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Delivery Status</InputLabel>
              <Select
                value={statusUpdateDialog.status}
                onChange={(e) => setStatusUpdateDialog(prev => ({
                  ...prev,
                  status: e.target.value
                }))}
                label="Delivery Status"
              >
                {Object.entries(DELIVERY_STATUSES).map(([key, value]) => (
                  <MenuItem key={value} value={value}>
                    {key.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Delivery Notes"
              value={statusUpdateDialog.notes}
              onChange={(e) => setStatusUpdateDialog(prev => ({
                ...prev,
                notes: e.target.value
              }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStatusUpdateDialog}>Cancel</Button>
          <Button 
            onClick={() => {
              handleUpdateDeliveryStatus(
                statusUpdateDialog.saleId,
                statusUpdateDialog.status,
                statusUpdateDialog.notes
              );
              closeStatusUpdateDialog();
            }}
            variant="contained"
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Details Dialog */}
      <Dialog 
        open={detailsDialog.open} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        {detailsDialog.sale && (
          <>
            <DialogTitle sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              Sale Details
              <IconButton
                edge="end"
                color="inherit"
                onClick={handleCloseDetails}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Customer Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Name
                        </Typography>
                        <Typography variant="body1">
                          {detailsDialog.sale.customer?.name || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Phone Number
                        </Typography>
                        <Typography variant="body1">
                          {detailsDialog.sale.customer?.phone || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Location
                        </Typography>
                        <Typography variant="body1">
                          {detailsDialog.sale.customer?.location || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Sale Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Product
                        </Typography>
                        <Typography variant="body1">
                          {detailsDialog.sale.product?.name || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Quantity
                        </Typography>
                        <Typography variant="body1">
                          {detailsDialog.sale.quantity}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Unit Price
                        </Typography>
                        <Typography variant="body1">
                          ${detailsDialog.sale.unit_price}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Discount
                        </Typography>
                        <Typography variant="body1">
                          ${detailsDialog.sale.discount_value || '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          Total Price: ${(detailsDialog.sale.quantity * detailsDialog.sale.unit_price).toFixed(2)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
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

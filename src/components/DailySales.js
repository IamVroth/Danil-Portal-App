import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Divider,
  InputAdornment,
  Autocomplete,
  ListSubheader,
  CircularProgress,
} from '@mui/material';
import {
  AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
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
  
  const isMobile = useMediaQuery('(max-width:600px)');
  const theme = useTheme();

  // Memoize fetchSales to prevent unnecessary re-renders
  const memoizedFetchSales = useCallback(async () => {
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          customers!inner (
            id,
            name,
            location,
            phone
          ),
          products!inner (
            id,
            name,
            unit_price
          ),
          delivery_companies (
            id,
            name
          )
        `)
        .gte('date', dateRange.startDate.format('YYYY-MM-DD'))
        .lte('date', dateRange.endDate.format('YYYY-MM-DD'))
        .order('date', { ascending: false });

      if (selectedLocation) {
        query = query.eq('customers.location', selectedLocation);
      }

      const { data, error } = await query;

      if (error) throw error;

      setSales(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sales:', error.message);
      showSnackbar(error.message, 'error');
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate, selectedLocation]);

  useEffect(() => {
    memoizedFetchSales();
  }, [memoizedFetchSales]);

  useEffect(() => {
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

  useEffect(() => {
    memoizedFetchSales();
  }, [dateRange.startDate, dateRange.endDate, selectedLocation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting form...', editingId ? editedSale : saleData);
    
    try {
      const formData = editingId ? editedSale : saleData;
      
      if (!formData.customer_id || !formData.product_id || !formData.quantity || !formData.unit_price) {
        showSnackbar('Please fill in all required fields', 'error');
        return;
      }

      const now = new Date().toISOString();
      const subtotal = Number(formData.quantity) * Number(formData.unit_price);
      
      // Calculate discount
      let discountAmount = 0;
      if (formData.discount_type === DISCOUNT_TYPES.PERCENTAGE) {
        discountAmount = (subtotal * Number(formData.discount_value)) / 100;
      } else if (formData.discount_type === DISCOUNT_TYPES.FIXED) {
        discountAmount = Number(formData.discount_value);
      }

      // Calculate delivery charge
      const deliveryCharge = formData.is_promotional ? 0 : Number(formData.delivery_charge);
      
      // Calculate final total
      const total = subtotal - discountAmount + deliveryCharge;

      const saleRecord = {
        date: formData.date.format('YYYY-MM-DD'),
        customer_id: formData.customer_id,
        product_id: formData.product_id,
        quantity: Number(formData.quantity),
        unit_price: Number(formData.unit_price),
        has_delivery: formData.has_delivery,
        delivery_charge: deliveryCharge,
        delivery_cost: formData.has_delivery ? Number(formData.delivery_cost) : 0,
        is_promotional: formData.is_promotional,
        delivery_status: formData.has_delivery ? DELIVERY_STATUSES.PENDING : null,
        delivery_notes: formData.delivery_notes || null,
        delivery_company: formData.has_delivery ? formData.delivery_company : null,
        delivery_updated_at: formData.has_delivery ? now : null,
        discount_type: formData.discount_type || null,
        discount_value: formData.discount_type ? Number(formData.discount_value) : 0,
        payment_status: 'paid'
      };

      let result;
      if (editingId) {
        // Update existing sale
        const { data: updatedSale, error: updateError } = await supabase
          .from('sales')
          .update(saleRecord)
          .eq('id', editingId)
          .select();

        if (updateError) throw updateError;
        result = updatedSale;
        showSnackbar('Sale updated successfully', 'success');
      } else {
        // Insert new sale
        const { data: newSale, error: insertError } = await supabase
          .from('sales')
          .insert([saleRecord])
          .select();

        if (insertError) throw insertError;
        result = newSale;
        showSnackbar('Sale created successfully', 'success');
      }

      // Fetch updated sales list
      await memoizedFetchSales();
      
      // Reset form
      setEditingId(null);
      setEditedSale({});
      setSaleData(initialSaleData);
      setOpenNewDialog(false);
      
    } catch (error) {
      console.error('Error:', error);
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
    setOpenNewDialog(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedSale({});
    setSaleData(initialSaleData);
    setOpenNewDialog(false);
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
      await memoizedFetchSales(); // Refresh the list to get the computed total_amount
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
  const renderMobileSaleCard = (sale, theme) => {
    const isDarkMode = theme.palette.mode === 'dark';

    return (
      <Grid container spacing={2} sx={{ 
        p: '3vw', 
        backgroundColor: isDarkMode ? '#1a1f2e' : 'background.paper',
        borderRadius: '2vw',
        boxShadow: theme.shadows[1]
      }}>
        {/* Date */}
        <Grid item xs={12}>
          <Typography 
            variant="subtitle2" 
            color="text.secondary"
            sx={{ fontSize: 'calc(12px + 0.3vw)' }}
          >
            {dayjs(sale.date).format('YYYY-MM-DD')}
          </Typography>
        </Grid>

        {/* Customer and Product Names */}
        <Grid item xs={12}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontSize: 'calc(14px + 0.5vw)',
              fontWeight: 'bold',
              color: 'text.primary',
              mb: '0.5vw'
            }}
          >
            {sale.customers?.name || 'N/A'}
          </Typography>
          <Typography 
            variant="body1"
            sx={{ 
              fontSize: 'calc(12px + 0.4vw)',
              color: 'text.secondary'
            }}
          >
            {sale.products?.name || 'N/A'}
          </Typography>
        </Grid>

        {/* Quantity and Total */}
        <Grid item container xs={12} alignItems="center" spacing={1}>
          <Grid item>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: 'calc(12px + 0.3vw)' }}
            >
              Qty: {sale.quantity}
            </Typography>
          </Grid>
          <Grid item xs>
            <Typography 
              variant="h6" 
              color="primary"
              align="right"
              sx={{ 
                fontSize: 'calc(16px + 0.5vw)',
                fontWeight: 'bold'
              }}
            >
              ${(() => {
                const subtotal = sale.quantity * sale.unit_price;
                const discount = sale.discount_type === DISCOUNT_TYPES.PERCENTAGE
                  ? (subtotal * sale.discount_value) / 100
                  : (sale.discount_value || 0);
                const deliveryCharge = sale.has_delivery && !sale.is_promotional
                  ? (sale.delivery_charge || 0)
                  : 0;
                return (subtotal - discount + deliveryCharge).toFixed(2);
              })()}
            </Typography>
          </Grid>
        </Grid>

        {/* Contact Info */}
        <Grid item container xs={12} spacing={2}>
          <Grid item xs={6}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '1vw'
            }}>
              <PhoneIcon sx={{ 
                fontSize: 'calc(14px + 0.4vw)',
                color: 'text.secondary'
              }} />
              <Typography 
                variant="body2" 
                color="text.secondary"
                noWrap
                sx={{ fontSize: 'calc(12px + 0.3vw)' }}
              >
                {sale.customers?.phone || 'N/A'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '1vw'
            }}>
              <LocationOnIcon sx={{ 
                fontSize: 'calc(14px + 0.4vw)',
                color: 'text.secondary'
              }} />
              <Typography 
                variant="body2" 
                color="text.secondary"
                noWrap
                sx={{ fontSize: 'calc(12px + 0.3vw)' }}
              >
                {sale.customers?.location || 'N/A'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Grid>
    );
  };

  const filteredSales = sales.filter(sale => {
    if (selectedLocation && sale.customers?.location !== selectedLocation) {
      return false;
    }
    return true;
  });

  // Calculate total for display
  const calculateTotal = (sale) => {
    const subtotal = sale.quantity * sale.unit_price;
    let discountAmount = 0;
    
    if (sale.discount_type === DISCOUNT_TYPES.PERCENTAGE) {
      discountAmount = (subtotal * Number(sale.discount_value)) / 100;
    } else if (sale.discount_type === DISCOUNT_TYPES.FIXED) {
      discountAmount = Number(sale.discount_value);
    }

    const deliveryCharge = sale.is_promotional ? 0 : Number(sale.delivery_charge || 0);
    return subtotal - discountAmount + deliveryCharge;
  };

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Debounced search function for customers
  const debouncedCustomerSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery) return;
      setIsLoadingCustomers(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, phone, location')
          .ilike('name', `%${searchQuery}%`)
          .order('name')
          .limit(50);

        if (error) throw error;
        setCustomers(data || []);
      } catch (error) {
        console.error('Error searching customers:', error.message);
        showSnackbar('Error searching customers', 'error');
      } finally {
        setIsLoadingCustomers(false);
      }
    }, 300),
    []
  );

  // Memoized filtered customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return customers;
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase())
    );
  }, [customers, customerSearchQuery]);

  // Helper function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

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
          height: '100vh',
          overflow: 'auto',
          p: 0,
          position: 'fixed',
          top: 0,
          left: 0,
          backgroundColor: 'background.default',
          pt: '64px' // Height of the app bar
        }}>
          {/* Title */}
          <Typography 
            variant="h4" 
            sx={{ 
              mt: '16px',
              mb: '3vw', 
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
            gap: '2vw', 
            justifyContent: 'center',
            width: '100%',
            mb: '3vw'
          }}>
            <IconButton
              sx={{
                width: '11vw',
                height: '11vw',
                maxWidth: '50px',
                maxHeight: '50px',
                minWidth: '40px',
                minHeight: '40px',
                borderRadius: '2vw',
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }}
              onClick={() => setOpenNewDialog(true)}
            >
              <AddIcon sx={{ fontSize: 'calc(18px + 0.5vw)' }} />
            </IconButton>
            <IconButton
              sx={{
                width: '11vw',
                height: '11vw',
                maxWidth: '50px',
                maxHeight: '50px',
                minWidth: '40px',
                minHeight: '40px',
                borderRadius: '2vw',
                backgroundColor: 'secondary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'secondary.dark',
                },
              }}
              onClick={handleOpenCustomerDialog}
            >
              <PersonAddIcon sx={{ fontSize: 'calc(18px + 0.5vw)' }} />
            </IconButton>
            <IconButton
              sx={{
                width: '11vw',
                height: '11vw',
                maxWidth: '50px',
                maxHeight: '50px',
                minWidth: '40px',
                minHeight: '40px',
                borderRadius: '2vw',
                backgroundColor: 'info.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'info.dark',
                },
              }}
              onClick={handleOpenProductDialog}
            >
              <AddBusinessIcon sx={{ fontSize: 'calc(18px + 0.5vw)' }} />
            </IconButton>
          </Box>

          {/* Filters Container */}
          <Box sx={{ 
            px: '20px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <FormControl
              fullWidth
              sx={{
                mb: 2
              }}
            >
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

            <FormControl
              fullWidth
              sx={{
                mb: 2
              }}
            >
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
          </Box>

          {/* Sales List */}
          <Box sx={{ 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '2vw'
          }}>
            {loading ? (
              <Typography sx={{ fontSize: 'calc(14px + 0.4vw)' }}>Loading...</Typography>
            ) : filteredSales.length > 0 ? (
              filteredSales.map((sale) => (
                <Box 
                  key={sale.id} 
                  sx={{ 
                    cursor: 'pointer',
                    mt: '20px',
                    mx: '20px',
                    marginLeft: '30px',
                    '&:hover': {
                      opacity: 0.8
                    },
                    '&:last-child': {
                      mb: '10px'
                    }
                  }}
                  onClick={() => handleRowClick(sale)}
                >
                  {renderMobileSaleCard(sale, theme)}
                </Box>
              ))
            ) : (
              <Typography sx={{ 
                fontSize: 'calc(14px + 0.4vw)',
                textAlign: 'center',
                color: 'text.secondary'
              }}>
                No sales found
              </Typography>
            )}
          </Box>
        </Box>
      ) : (
        // Desktop View
        <Box>
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

          {/* Desktop View Table */}
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(loading ? Array(5).fill({}) : filteredSales).map((sale, index) => (
                  <TableRow
                    key={sale.id || index}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>{loading ? 'Loading...' : dayjs(sale.date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>{loading ? 'Loading...' : sale.customers?.name || 'N/A'}</TableCell>
                    <TableCell>{loading ? 'Loading...' : sale.customers?.location || 'N/A'}</TableCell>
                    <TableCell>{loading ? 'Loading...' : sale.customers?.phone || 'N/A'}</TableCell>
                    <TableCell>{loading ? 'Loading...' : sale.products?.name || 'N/A'}</TableCell>
                    <TableCell align="right">{loading ? 'Loading...' : sale.quantity}</TableCell>
                    <TableCell align="right">{loading ? 'Loading...' : `$${sale.unit_price}`}</TableCell>
                    <TableCell align="right">
                      {loading ? 'Loading...' : `$${calculateTotal(sale).toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(sale)}
                          disabled={loading}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        {sale.has_delivery && (
                          <IconButton
                            size="small"
                            onClick={() => openStatusUpdateDialog(sale)}
                            disabled={loading}
                          >
                            <LocalShippingIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Dialogs */}
      <Dialog 
        open={openNewDialog} 
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handleSubmit} noValidate>
          <DialogTitle>
            {editingId ? 'Edit Sale' : 'New Sale'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Date"
                      value={editingId ? editedSale.date : saleData.date}
                      onChange={(newValue) => editingId ? setEditedSale({ ...editedSale, date: newValue }) : setSaleData({ ...saleData, date: newValue })}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Autocomplete
                      fullWidth
                      options={filteredCustomers}
                      getOptionLabel={(option) => option.name}
                      value={customers.find(c => c.id === (editingId ? editedSale.customer_id : saleData.customer_id)) || null}
                      onChange={(_, newValue) => {
                        if (editingId) {
                          setEditedSale({ ...editedSale, customer_id: newValue?.id || '' });
                        } else {
                          setSaleData({ ...saleData, customer_id: newValue?.id || '' });
                        }
                      }}
                      onInputChange={(_, newInputValue) => {
                        setCustomerSearchQuery(newInputValue);
                        debouncedCustomerSearch(newInputValue);
                      }}
                      loading={isLoadingCustomers}
                      filterOptions={(options) => options}
                      disableListWrap
                      componentsProps={{
                        popper: {
                          placement: 'bottom-start',
                          modifiers: [
                            { name: 'flip', enabled: false },
                            { name: 'preventOverflow', enabled: false }
                          ]
                        }
                      }}
                      slotProps={{
                        paper: {
                          sx: {
                            maxHeight: '400px',
                            '& .MuiAutocomplete-listbox': {
                              maxHeight: '400px',
                              scrollBehavior: 'smooth',
                              '& .MuiAutocomplete-option': {
                                paddingY: 1
                              }
                            }
                          }
                        }
                      }}
                      renderOption={(props, option) => (
                        <li {...props} style={{ padding: '8px 16px' }}>
                          <Box>
                            <Typography variant="body1">{option.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.phone} • {option.location}
                            </Typography>
                          </Box>
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Customer"
                          placeholder="Search customer..."
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <React.Fragment>
                                {isLoadingCustomers ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </React.Fragment>
                            ),
                          }}
                        />
                      )}
                      ListboxProps={{
                        style: { padding: 0 }
                      }}
                    />
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
                        value={editingId ? editedSale.product_id : saleData.product_id}
                        onChange={(e) => editingId ? setEditedSale({ ...editedSale, product_id: e.target.value }) : handleProductChange(e.target.value)}
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
                    value={editingId ? editedSale.quantity : saleData.quantity}
                    onChange={(e) => editingId ? setEditedSale({ ...editedSale, quantity: e.target.value }) : setSaleData({ ...saleData, quantity: e.target.value })}
                    inputProps={{ min: "1" }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Unit Price"
                    type="number"
                    value={editingId ? editedSale.unit_price : saleData.unit_price}
                    onChange={(e) => editingId ? setEditedSale({ ...editedSale, unit_price: e.target.value }) : setSaleData({ ...saleData, unit_price: e.target.value })}
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
                      value={editingId ? editedSale.has_delivery : saleData.has_delivery}
                      onChange={(e) => editingId ? setEditedSale(prev => ({ 
                        ...prev, 
                        has_delivery: e.target.value,
                        delivery_charge: e.target.value ? prev.delivery_charge : 0,
                        delivery_cost: e.target.value ? prev.delivery_cost : 0,
                        is_promotional: e.target.value ? prev.is_promotional : false,
                        delivery_status: e.target.value ? DELIVERY_STATUSES.PENDING : null
                      })) : setSaleData(prev => ({ 
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

                {(editingId ? editedSale.has_delivery : saleData.has_delivery) && (
                  <>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Delivery Company</InputLabel>
                        <Select
                          value={editingId ? editedSale.delivery_company : saleData.delivery_company}
                          onChange={(e) => editingId ? setEditedSale(prev => ({ 
                            ...prev, 
                            delivery_company: e.target.value
                          })) : setSaleData(prev => ({ 
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
                          value={editingId ? editedSale.is_promotional : saleData.is_promotional}
                          onChange={(e) => editingId ? setEditedSale(prev => ({ 
                            ...prev, 
                            is_promotional: e.target.value,
                            delivery_charge: e.target.value ? 0 : prev.delivery_cost
                          })) : setSaleData(prev => ({ 
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
                        value={editingId ? editedSale.delivery_cost : saleData.delivery_cost}
                        onChange={(e) => editingId ? setEditedSale(prev => ({ 
                          ...prev, 
                          delivery_cost: e.target.value,
                          delivery_charge: prev.is_promotional ? 0 : e.target.value
                        })) : setSaleData(prev => ({ 
                          ...prev, 
                          delivery_cost: e.target.value,
                          delivery_charge: prev.is_promotional ? 0 : e.target.value
                        }))}
                        InputProps={{
                          inputProps: { min: 0, step: 0.01 }
                        }}
                      />
                    </Grid>

                    {!editingId && !saleData.is_promotional && (
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Delivery Charge (Customer)"
                          type="number"
                          value={editingId ? editedSale.delivery_charge : saleData.delivery_charge}
                          onChange={(e) => editingId ? setEditedSale(prev => ({ 
                            ...prev, 
                            delivery_charge: e.target.value 
                          })) : setSaleData(prev => ({ 
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
                      value={editingId ? editedSale.discount_type : saleData.discount_type}
                      onChange={(e) => editingId ? setEditedSale(prev => ({ 
                        ...prev, 
                        discount_type: e.target.value,
                        discount_value: e.target.value ? prev.discount_value : 0
                      })) : setSaleData(prev => ({ 
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

                {(editingId ? editedSale.discount_type : saleData.discount_type) && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={(editingId ? editedSale.discount_type : saleData.discount_type) === DISCOUNT_TYPES.PERCENTAGE ? 'Discount Percentage' : 'Discount Amount'}
                      type="number"
                      value={editingId ? editedSale.discount_value : saleData.discount_value}
                      onChange={(e) => editingId ? setEditedSale(prev => ({ 
                        ...prev, 
                        discount_value: e.target.value 
                      })) : setSaleData(prev => ({ 
                        ...prev, 
                        discount_value: e.target.value 
                      }))}
                      InputProps={{
                        inputProps: { 
                          min: 0,
                          max: (editingId ? editedSale.discount_type : saleData.discount_type) === DISCOUNT_TYPES.PERCENTAGE ? 100 : undefined,
                          step: "0.01"
                        },
                        endAdornment: (
                          <InputAdornment position="end">
                            {(editingId ? editedSale.discount_type : saleData.discount_type) === DISCOUNT_TYPES.PERCENTAGE ? '%' : '$'}
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                )}
                {/* Add price summary section */}
                {(editingId ? editedSale.quantity : saleData.quantity) && (editingId ? editedSale.unit_price : saleData.unit_price) && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom>Price Summary</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography>Subtotal:</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography align="right">
                          ${(() => {
                            const subtotal = (Number(editingId ? editedSale.quantity : saleData.quantity) * Number(editingId ? editedSale.unit_price : saleData.unit_price)) || 0;
                            return subtotal.toFixed(2);
                          })()}
                        </Typography>
                      </Grid>

                      {(editingId ? editedSale.discount_type : saleData.discount_type) && (
                        <>
                          <Grid item xs={6}>
                            <Typography color="error">
                              Discount ({(editingId ? editedSale.discount_type : saleData.discount_type) === DISCOUNT_TYPES.PERCENTAGE 
                                ? `${editingId ? editedSale.discount_value : saleData.discount_value}%`
                                : `$${editingId ? editedSale.discount_value : saleData.discount_value}`}):
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography align="right" color="error">
                              -${(() => {
                                const quantity = Number(editingId ? editedSale.quantity : saleData.quantity);
                                const unitPrice = Number(editingId ? editedSale.unit_price : saleData.unit_price);
                                const discountType = editingId ? editedSale.discount_type : saleData.discount_type;
                                const discountValue = Number(editingId ? editedSale.discount_value : saleData.discount_value) || 0;
                                
                                if (discountType === DISCOUNT_TYPES.PERCENTAGE) {
                                  return ((quantity * unitPrice * discountValue) / 100).toFixed(2);
                                }
                                return discountValue.toFixed(2);
                              })()}
                            </Typography>
                          </Grid>
                        </>
                      )}

                      {(editingId ? editedSale.has_delivery : saleData.has_delivery) && (
                        <>
                          <Grid item xs={6}>
                            <Typography>
                              Delivery {(editingId ? editedSale.is_promotional : saleData.is_promotional) && '(Free)'}:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography align="right">
                              ${(() => {
                                const isPromotional = editingId ? editedSale.is_promotional : saleData.is_promotional;
                                if (isPromotional) return '0.00';
                                
                                const deliveryCharge = Number(editingId ? editedSale.delivery_charge : saleData.delivery_charge) || 0;
                                return deliveryCharge.toFixed(2);
                              })()}
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
                          ${(() => {
                            const quantity = Number(editingId ? editedSale.quantity : saleData.quantity);
                            const unitPrice = Number(editingId ? editedSale.unit_price : saleData.unit_price);
                            const subtotal = quantity * unitPrice;
                            
                            // Calculate discount
                            const discountType = editingId ? editedSale.discount_type : saleData.discount_type;
                            const discountValue = Number(editingId ? editedSale.discount_value : saleData.discount_value) || 0;
                            const discount = discountType === DISCOUNT_TYPES.PERCENTAGE 
                              ? (subtotal * discountValue) / 100 
                              : discountValue;
                            
                            // Calculate delivery charge
                            const hasDelivery = editingId ? editedSale.has_delivery : saleData.has_delivery;
                            const isPromotional = editingId ? editedSale.is_promotional : saleData.is_promotional;
                            const deliveryCharge = hasDelivery && !isPromotional 
                              ? Number(editingId ? editedSale.delivery_charge : saleData.delivery_charge) 
                              : 0;
                            
                            // Calculate total
                            return (subtotal - discount + deliveryCharge).toFixed(2);
                          })()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={handleCancel}>Cancel</Button>
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
                          {detailsDialog.sale.customers?.name || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Phone Number
                        </Typography>
                        <Typography variant="body1">
                          {detailsDialog.sale.customers?.phone || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Location
                        </Typography>
                        <Typography variant="body1">
                          {detailsDialog.sale.customers?.location || 'N/A'}
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
                          {detailsDialog.sale.products?.name || 'N/A'}
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

import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Snackbar,
  Alert,
  Autocomplete,
  TextField,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  FormControlLabel,
  Switch,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ContentCopy as CopyIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import supabase from '../supabaseClient';

const QuickSalesEntry = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [rows, setRows] = useState([createEmptyRow()]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [deliveryCompanies, setDeliveryCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  
  const firstInputRef = useRef(null);

  // Create empty row with default values
  function createEmptyRow(index = 0) {
    return {
      id: `temp-${Date.now()}-${index}`,
      date: dayjs(),
      customer: null,
      product: null,
      quantity: '',
      unit_price: '',
      discount_type: null,
      discount_value: '',
      has_delivery: false,
      delivery_company: null,
      delivery_charge: '',
      delivery_cost: '',
      delivery_status: 'pending',
      is_promotional: false,
      notes: '',
    };
  }

  // Fetch data on mount
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchDeliveryCompanies();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      showSnackbar('Error loading customers', 'error');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      showSnackbar('Error loading products', 'error');
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
      console.error('Error fetching delivery companies:', error);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Add new row
  const addRow = () => {
    setRows([...rows, createEmptyRow(rows.length)]);
  };

  // Delete row
  const deleteRow = (index) => {
    if (rows.length === 1) {
      setRows([createEmptyRow()]);
    } else {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  // Duplicate row
  const duplicateRow = (index) => {
    const rowToDuplicate = { ...rows[index], id: `temp-${Date.now()}-${rows.length}` };
    const newRows = [...rows];
    newRows.splice(index + 1, 0, rowToDuplicate);
    setRows(newRows);
  };

  // Update row field
  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;

    // Auto-fill unit price when product is selected
    if (field === 'product' && value) {
      newRows[index].unit_price = value.unit_price || '';
    }

    setRows(newRows);
  };

  // Calculate total for a row
  const calculateRowTotal = (row) => {
    const quantity = parseFloat(row.quantity) || 0;
    const unitPrice = parseFloat(row.unit_price) || 0;
    const subtotal = quantity * unitPrice;
    
    let discount = 0;
    if (row.discount_type === 'percentage') {
      discount = (subtotal * (parseFloat(row.discount_value) || 0)) / 100;
    } else if (row.discount_type === 'fixed') {
      discount = parseFloat(row.discount_value) || 0;
    }
    
    const deliveryCharge = row.has_delivery ? (parseFloat(row.delivery_charge) || 0) : 0;
    
    return subtotal - discount + deliveryCharge;
  };

  // Validate row
  const validateRow = (row) => {
    const errors = [];
    if (!row.customer) errors.push('Customer required');
    if (!row.product) errors.push('Product required');
    if (!row.quantity || parseFloat(row.quantity) <= 0) errors.push('Valid quantity required');
    if (!row.unit_price || parseFloat(row.unit_price) <= 0) errors.push('Valid price required');
    if (row.has_delivery && !row.delivery_company) errors.push('Delivery company required');
    return errors;
  };

  // Save all rows
  const saveAllRows = async () => {
    setLoading(true);
    try {
      const validRows = [];
      const invalidRows = [];

      rows.forEach((row, index) => {
        const errors = validateRow(row);
        if (errors.length === 0) {
          validRows.push({ row, index });
        } else {
          invalidRows.push({ row, index, errors });
        }
      });

      if (invalidRows.length > 0) {
        const errorMsg = `${invalidRows.length} row(s) have errors. Please fix them before saving.`;
        showSnackbar(errorMsg, 'error');
        setLoading(false);
        return;
      }

      // Prepare data for insertion
      const salesData = validRows.map(({ row }) => {
        const quantity = parseFloat(row.quantity);
        const unitPrice = parseFloat(row.unit_price);
        const subtotal = quantity * unitPrice;
        
        let discountAmount = 0;
        if (row.discount_type === 'percentage') {
          discountAmount = (subtotal * (parseFloat(row.discount_value) || 0)) / 100;
        } else if (row.discount_type === 'fixed') {
          discountAmount = parseFloat(row.discount_value) || 0;
        }

        return {
          date: row.date.format('YYYY-MM-DD'),
          customer_id: row.customer.id,
          product_id: row.product.id,
          quantity,
          unit_price: unitPrice,
          discount_type: row.discount_type,
          discount_value: row.discount_type ? (parseFloat(row.discount_value) || 0) : 0,
          has_delivery: row.has_delivery,
          delivery_company_id: row.has_delivery && row.delivery_company ? row.delivery_company.id : null,
          delivery_charge: row.has_delivery ? (parseFloat(row.delivery_charge) || 0) : 0,
          delivery_cost: row.has_delivery ? (parseFloat(row.delivery_cost) || 0) : 0,
          delivery_status: row.has_delivery ? row.delivery_status : null,
          is_promotional: row.is_promotional,
          notes: row.notes || null,
        };
      });

      const { data, error } = await supabase
        .from('sales')
        .insert(salesData)
        .select();

      if (error) throw error;

      showSnackbar(`Successfully saved ${data.length} sale(s)!`, 'success');
      
      // Reset to single empty row
      setRows([createEmptyRow()]);
      
      // Focus first input
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 100);

    } catch (error) {
      console.error('Error saving sales:', error);
      showSnackbar('Error saving sales: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Clear all rows
  const clearAllRows = () => {
    setRows([createEmptyRow()]);
  };

  // Download CSV template
  const downloadTemplate = () => {
    const headers = [
      'Date (YYYY-MM-DD)',
      'Customer Name',
      'Product Name',
      'Quantity',
      'Unit Price',
      'Discount Type (percentage/fixed)',
      'Discount Value',
      'Has Delivery (true/false)',
      'Delivery Company',
      'Delivery Charge',
      'Delivery Cost',
      'Delivery Status',
      'Is Promotional (true/false)',
      'Notes'
    ];
    
    const csvContent = headers.join(',') + '\n' +
      '2025-01-01,John Doe,Product A,10,50.00,percentage,10,false,,,,,false,Sample note';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Handle CSV file upload
  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target.result;
      parseCsv(text);
    };
    
    reader.readAsText(file);
  };

  // Parse CSV content
  const parseCsv = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      showSnackbar('CSV file is empty or invalid', 'error');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const preview = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      const row = {
        lineNumber: i + 1,
        date: values[0] || '',
        customerName: values[1] || '',
        productName: values[2] || '',
        quantity: values[3] || '',
        unitPrice: values[4] || '',
        discountType: values[5] || '',
        discountValue: values[6] || '',
        hasDelivery: values[7] || 'false',
        deliveryCompany: values[8] || '',
        deliveryCharge: values[9] || '',
        deliveryCost: values[10] || '',
        deliveryStatus: values[11] || 'pending',
        isPromotional: values[12] || 'false',
        notes: values[13] || '',
      };

      // Validate row
      const rowErrors = [];
      if (!row.date || !dayjs(row.date).isValid()) rowErrors.push('Invalid date');
      if (!row.customerName) rowErrors.push('Customer name required');
      if (!row.productName) rowErrors.push('Product name required');
      if (!row.quantity || isNaN(row.quantity)) rowErrors.push('Invalid quantity');
      if (!row.unitPrice || isNaN(row.unitPrice)) rowErrors.push('Invalid unit price');

      if (rowErrors.length > 0) {
        errors.push({ lineNumber: row.lineNumber, errors: rowErrors });
      }

      preview.push(row);
    }

    setCsvPreview(preview);
    setCsvErrors(errors);
    setCsvDialogOpen(true);
  };

  // Import CSV data
  const importCsvData = async () => {
    if (csvErrors.length > 0) {
      showSnackbar('Please fix all errors before importing', 'error');
      return;
    }

    setLoading(true);
    try {
      const salesData = [];

      for (const row of csvPreview) {
        // Find customer
        const customer = customers.find(c => 
          c.name.toLowerCase() === row.customerName.toLowerCase()
        );
        if (!customer) {
          throw new Error(`Customer "${row.customerName}" not found at line ${row.lineNumber}`);
        }

        // Find product
        const product = products.find(p => 
          p.name.toLowerCase() === row.productName.toLowerCase()
        );
        if (!product) {
          throw new Error(`Product "${row.productName}" not found at line ${row.lineNumber}`);
        }

        // Find delivery company if needed
        let deliveryCompanyId = null;
        if (row.hasDelivery === 'true' && row.deliveryCompany) {
          const deliveryCompany = deliveryCompanies.find(dc => 
            dc.name.toLowerCase() === row.deliveryCompany.toLowerCase()
          );
          if (!deliveryCompany) {
            throw new Error(`Delivery company "${row.deliveryCompany}" not found at line ${row.lineNumber}`);
          }
          deliveryCompanyId = deliveryCompany.id;
        }

        salesData.push({
          date: row.date,
          customer_id: customer.id,
          product_id: product.id,
          quantity: parseFloat(row.quantity),
          unit_price: parseFloat(row.unitPrice),
          discount_type: row.discountType || null,
          discount_value: row.discountValue ? parseFloat(row.discountValue) : 0,
          has_delivery: row.hasDelivery === 'true',
          delivery_company_id: deliveryCompanyId,
          delivery_charge: row.deliveryCharge ? parseFloat(row.deliveryCharge) : 0,
          delivery_cost: row.deliveryCost ? parseFloat(row.deliveryCost) : 0,
          delivery_status: row.deliveryStatus || 'pending',
          is_promotional: row.isPromotional === 'true',
          notes: row.notes || null,
        });
      }

      const { data, error } = await supabase
        .from('sales')
        .insert(salesData)
        .select();

      if (error) throw error;

      showSnackbar(`Successfully imported ${data.length} sale(s)!`, 'success');
      setCsvDialogOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      setCsvErrors([]);

    } catch (error) {
      console.error('Error importing CSV:', error);
      showSnackbar('Error importing: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveAllRows();
      }
      // Ctrl/Cmd + N to add new row
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addRow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3, maxWidth: '100%', overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Quick Sales Entry</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadTemplate}
            >
              Download Template
            </Button>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
            >
              Import CSV
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={handleCsvUpload}
              />
            </Button>
          </Stack>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Tooltip title="Add Row (Ctrl+N)">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={addRow}
              >
                Add Row
              </Button>
            </Tooltip>
            <Tooltip title="Save All (Ctrl+S)">
              <Button
                variant="contained"
                color="success"
                startIcon={<SaveIcon />}
                onClick={saveAllRows}
                disabled={loading || rows.length === 0}
              >
                {loading ? <CircularProgress size={24} /> : 'Save All'}
              </Button>
            </Tooltip>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ClearIcon />}
              onClick={clearAllRows}
            >
              Clear All
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="h6" sx={{ alignSelf: 'center' }}>
              Total Rows: {rows.length}
            </Typography>
          </Stack>

          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 50 }}>#</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>Date</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Customer *</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Product *</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Qty *</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Price *</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Discount</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Delivery</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Total</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{index + 1}</TableCell>
                    
                    {/* Date */}
                    <TableCell>
                      <DatePicker
                        value={row.date}
                        onChange={(newValue) => updateRow(index, 'date', newValue)}
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true,
                            inputRef: index === 0 ? firstInputRef : null,
                          }
                        }}
                      />
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <Autocomplete
                        value={row.customer}
                        onChange={(e, newValue) => updateRow(index, 'customer', newValue)}
                        options={customers}
                        getOptionLabel={(option) => option.name || ''}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder="Select customer"
                            error={!row.customer}
                          />
                        )}
                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                      />
                    </TableCell>

                    {/* Product */}
                    <TableCell>
                      <Autocomplete
                        value={row.product}
                        onChange={(e, newValue) => updateRow(index, 'product', newValue)}
                        options={products}
                        getOptionLabel={(option) => option.name || ''}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder="Select product"
                            error={!row.product}
                          />
                        )}
                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                      />
                    </TableCell>

                    {/* Quantity */}
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.quantity}
                        onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        error={!row.quantity || parseFloat(row.quantity) <= 0}
                        fullWidth
                      />
                    </TableCell>

                    {/* Unit Price */}
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.unit_price}
                        onChange={(e) => updateRow(index, 'unit_price', e.target.value)}
                        placeholder="Price"
                        error={!row.unit_price || parseFloat(row.unit_price) <= 0}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        fullWidth
                      />
                    </TableCell>

                    {/* Discount */}
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <TextField
                          select
                          size="small"
                          value={row.discount_type || ''}
                          onChange={(e) => updateRow(index, 'discount_type', e.target.value || null)}
                          sx={{ width: 60 }}
                        >
                          <MenuItem value="">-</MenuItem>
                          <MenuItem value="percentage">%</MenuItem>
                          <MenuItem value="fixed">$</MenuItem>
                        </TextField>
                        {row.discount_type && (
                          <TextField
                            type="number"
                            size="small"
                            value={row.discount_value}
                            onChange={(e) => updateRow(index, 'discount_value', e.target.value)}
                            sx={{ width: 60 }}
                          />
                        )}
                      </Stack>
                    </TableCell>

                    {/* Delivery */}
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={row.has_delivery}
                            onChange={(e) => updateRow(index, 'has_delivery', e.target.checked)}
                          />
                        }
                        label=""
                      />
                    </TableCell>

                    {/* Total */}
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        ${calculateRowTotal(row).toFixed(2)}
                      </Typography>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Duplicate">
                          <IconButton
                            size="small"
                            onClick={() => duplicateRow(index)}
                            color="primary"
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => deleteRow(index)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Keyboard Shortcuts:</strong> Ctrl+S (Save All) | Ctrl+N (Add Row) | Tab (Navigate)
            </Typography>
          </Box>
        </Paper>

        {/* CSV Import Dialog */}
        <Dialog open={csvDialogOpen} onClose={() => setCsvDialogOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>
            CSV Import Preview
            {csvErrors.length > 0 && (
              <Chip
                label={`${csvErrors.length} Error(s)`}
                color="error"
                size="small"
                sx={{ ml: 2 }}
              />
            )}
          </DialogTitle>
          <DialogContent>
            {csvErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Errors found:</Typography>
                {csvErrors.map((err, i) => (
                  <Typography key={i} variant="body2">
                    Line {err.lineNumber}: {err.errors.join(', ')}
                  </Typography>
                ))}
              </Alert>
            )}
            
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Line</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvPreview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.lineNumber}</TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell>{row.productName}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>${row.unitPrice}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCsvDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={importCsvData}
              disabled={loading || csvErrors.length > 0}
            >
              {loading ? <CircularProgress size={24} /> : `Import ${csvPreview.length} Row(s)`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default QuickSalesEntry;

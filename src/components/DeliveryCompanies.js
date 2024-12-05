import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import supabase from '../supabaseClient';

const initialCompanyData = {
  name: '',
  code: '',
  status: 'active'
};

function DeliveryCompanies() {
  const [companies, setCompanies] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formData, setFormData] = useState(initialCompanyData);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching delivery companies:', error.message);
    }
  };

  const handleOpenDialog = (mode, company = null) => {
    setDialogMode(mode);
    setSelectedCompany(company);
    setFormData(company || initialCompanyData);
    setOpenDialog(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(initialCompanyData);
    setSelectedCompany(null);
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Company name is required');
      return false;
    }
    if (!formData.code.trim()) {
      setError('Company code is required');
      return false;
    }
    // Code should be lowercase, no spaces
    if (!/^[a-z0-9_]+$/.test(formData.code)) {
      setError('Company code should contain only lowercase letters, numbers, and underscores');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (dialogMode === 'add') {
        const { error } = await supabase
          .from('delivery_companies')
          .insert([formData]);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('delivery_companies')
          .update(formData)
          .eq('id', selectedCompany.id);
        
        if (error) throw error;
      }

      handleCloseDialog();
      fetchCompanies();
    } catch (error) {
      console.error('Error saving delivery company:', error.message);
      setError(error.message);
    }
  };

  const handleDelete = async (company) => {
    try {
      // First check if this company is used in any sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id')
        .eq('delivery_company', company.id)
        .limit(1);

      if (salesError) throw salesError;

      if (salesData && salesData.length > 0) {
        // Company is being used in sales records
        if (window.confirm(
          `${company.name} is being used in sales records. Would you like to deactivate it instead of deleting?\n\n` +
          'Deactivating will keep all sales records intact but hide it from new sales.'
        )) {
          const { error } = await supabase
            .from('delivery_companies')
            .update({ status: 'inactive' })
            .eq('id', company.id);

          if (error) throw error;
          fetchCompanies();
        }
      } else {
        // Company is not being used, safe to delete
        if (window.confirm(
          `Are you sure you want to permanently delete ${company.name}?\n\n` +
          'This action cannot be undone!'
        )) {
          const { error } = await supabase
            .from('delivery_companies')
            .delete()
            .eq('id', company.id);

          if (error) throw error;
          fetchCompanies();
        }
      }
    } catch (error) {
      console.error('Error handling delivery company deletion:', error.message);
      setError(error.message);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Delivery Companies
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('add')}
        >
          Add Company
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>{company.name}</TableCell>
                <TableCell>{company.code}</TableCell>
                <TableCell>
                  <Chip
                    label={company.status}
                    color={company.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <UsageCount companyId={company.id} />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={() => handleOpenDialog('edit', company)}
                    size="small"
                    title="Edit"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(company)}
                    size="small"
                    color="error"
                    title={company.status === 'active' ? 'Delete/Deactivate' : 'Delete'}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {dialogMode === 'add' ? 'Add New Delivery Company' : 'Edit Delivery Company'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                label="Company Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Company Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                fullWidth
                required
                helperText="Use lowercase letters, numbers, and underscores only"
                disabled={dialogMode === 'edit'}
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
              {error && (
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {dialogMode === 'add' ? 'Add' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

function UsageCount({ companyId }) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from('sales')
          .select('id', { count: 'exact', head: true })
          .eq('delivery_company', companyId);

        if (error) throw error;
        setCount(count || 0);
      } catch (error) {
        console.error('Error fetching usage count:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, [companyId]);

  if (loading) return <span>Loading...</span>;
  return <span>{count} sales</span>;
}

export default DeliveryCompanies;

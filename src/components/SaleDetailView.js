import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Grid,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import dayjs from 'dayjs';
import { DELIVERY_STATUSES } from './DailySales';

const SaleDetailView = ({ sale, onBack, onEdit, getDeliveryStatusColor }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const total = (sale.quantity * sale.unit_price) - (sale.discount_value || 0);

  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: 'auto' }}>
      {/* Header with back button */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={onBack} color="primary">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">Sale Details</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={() => onEdit(sale)} color="primary">
          <EditIcon />
        </IconButton>
      </Box>

      {/* Main content */}
      <Grid container spacing={3}>
        {/* Basic Info Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Date
            </Typography>
            <Typography variant="body1" gutterBottom>
              {dayjs(sale.date).format('YYYY-MM-DD')}
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Customer Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1">
                  {sale.customer?.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1">
                  {sale.customer?.phone || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1">
                  {sale.customer?.location || 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Product and Price Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sale Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Product
                </Typography>
                <Typography variant="body1">
                  {sale.product?.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Quantity
                </Typography>
                <Typography variant="body1">
                  {sale.quantity}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Unit Price
                </Typography>
                <Typography variant="body1">
                  ${sale.unit_price}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Discount
                </Typography>
                <Typography variant="body1">
                  ${sale.discount_value || '0'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" color="primary">
                  Total: ${total.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Delivery Section */}
        {sale.has_delivery && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Delivery Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={sale.delivery_status}
                      color={getDeliveryStatusColor(sale.delivery_status)}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Delivery Company
                  </Typography>
                  <Typography variant="body1">
                    {sale.delivery_company || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Delivery Charge
                  </Typography>
                  <Typography variant="body1">
                    ${sale.delivery_charge || '0'}
                  </Typography>
                </Grid>
                {sale.delivery_notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body1">
                      {sale.delivery_notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SaleDetailView;

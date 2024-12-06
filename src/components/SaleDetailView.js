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
  
  // Calculate total with delivery charge and discount
  const total = (() => {
    const subtotal = sale.quantity * sale.unit_price;
    const discount = sale.discount_type === 'PERCENTAGE'
      ? (subtotal * sale.discount_value) / 100
      : (sale.discount_value || 0);
    const deliveryCharge = sale.has_delivery && !sale.is_promotional
      ? (sale.delivery_charge || 0)
      : 0;
    return (subtotal - discount + deliveryCharge).toFixed(2);
  })();

  return (
    <Box sx={{ 
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      backgroundColor: 'background.default',
      pt: '64px', // Height of the app bar
      overflowY: 'auto',
      zIndex: 1200
    }}>
      <Box sx={{ 
        width: '90vw',
        maxWidth: '800px',
        margin: '0 auto',
        pb: 4
      }}>
        {/* Header with back button */}
        <Box sx={{ 
          mb: 3, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          p: '4vw',
          position: 'sticky',
          top: 0,
          backgroundColor: 'background.default',
          zIndex: 1
        }}>
          <IconButton 
            onClick={onBack} 
            sx={{ 
              width: '40px',
              height: '40px'
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 'calc(20px + 0.5vw)' }} />
          </IconButton>
          <Typography 
            variant="h5" 
            sx={{ 
              fontSize: 'calc(20px + 1vw)',
              fontWeight: 'bold'
            }}
          >
            Sale Details
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton 
            onClick={() => onEdit(sale)} 
            sx={{ 
              width: '40px',
              height: '40px',
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            }}
          >
            <EditIcon sx={{ fontSize: 'calc(20px + 0.5vw)' }} />
          </IconButton>
        </Box>

        {/* Main content */}
        <Grid container spacing={2}>
          {/* Basic Info Section */}
          <Grid item xs={12}>
            <Paper sx={{ p: '4vw' }}>
              <Typography 
                variant="subtitle2" 
                color="text.secondary"
                sx={{ fontSize: 'calc(12px + 0.5vw)' }}
              >
                Date
              </Typography>
              <Typography 
                variant="body1"
                sx={{ fontSize: 'calc(14px + 0.5vw)', mb: 2 }}
              >
                {dayjs(sale.date).format('YYYY-MM-DD')}
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Typography 
                variant="h6" 
                sx={{ 
                  fontSize: 'calc(18px + 0.5vw)',
                  fontWeight: 'bold',
                  mb: 2
                }}
              >
                Customer Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                  >
                    Name
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                  >
                    {sale.customers?.name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                  >
                    Phone
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                  >
                    {sale.customers?.phone || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                  >
                    Location
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                  >
                    {sale.customers?.location || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Product and Price Section */}
          <Grid item xs={12}>
            <Paper sx={{ p: '4vw' }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontSize: 'calc(18px + 0.5vw)',
                  fontWeight: 'bold',
                  mb: 2
                }}
              >
                Sale Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                  >
                    Product
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                  >
                    {sale.products?.name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                  >
                    Quantity
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                  >
                    {sale.quantity}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                  >
                    Unit Price
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                  >
                    ${sale.unit_price}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                  >
                    Discount
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                  >
                    ${sale.discount_value || '0'}
                    {sale.discount_type === 'PERCENTAGE' ? '%' : ''}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography 
                    variant="h6" 
                    color="primary"
                    sx={{ 
                      fontSize: 'calc(20px + 0.5vw)',
                      fontWeight: 'bold'
                    }}
                  >
                    Total: ${total}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Delivery Information Section */}
          {sale.has_delivery && (
            <Grid item xs={12}>
              <Paper sx={{ p: '4vw' }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: 'calc(18px + 0.5vw)',
                    fontWeight: 'bold',
                    mb: 2
                  }}
                >
                  Delivery Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography 
                      variant="subtitle2" 
                      color="text.secondary"
                      sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                    >
                      Status
                    </Typography>
                    <Chip
                      label={sale.delivery_status || 'Pending'}
                      sx={{
                        backgroundColor: getDeliveryStatusColor(sale.delivery_status),
                        color: 'white',
                        fontSize: 'calc(12px + 0.5vw)',
                        height: 'auto',
                        py: 0.5
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography 
                      variant="subtitle2" 
                      color="text.secondary"
                      sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                    >
                      Delivery Company
                    </Typography>
                    <Typography 
                      variant="body1"
                      sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                    >
                      {sale.delivery_companies?.name || sale.delivery_company || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography 
                      variant="subtitle2" 
                      color="text.secondary"
                      sx={{ fontSize: 'calc(12px + 0.5vw)' }}
                    >
                      Delivery Charge
                    </Typography>
                    <Typography 
                      variant="body1"
                      sx={{ fontSize: 'calc(14px + 0.5vw)' }}
                    >
                      ${sale.delivery_charge?.toFixed(2) || '0.00'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default SaleDetailView;

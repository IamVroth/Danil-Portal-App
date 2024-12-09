import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Button,
  TextField,
  Stack,
  Card,
  CardContent,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '../config/supabase';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import RefreshIcon from '@mui/icons-material/Refresh';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function Dashboard() {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [dailySalesData, setDailySalesData] = useState([]);
  const [monthlySalesData, setMonthlySalesData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [salesGrowth, setSalesGrowth] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().subtract(30, 'days'),
    endDate: dayjs()
  });
  const [customerStats, setCustomerStats] = useState({
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    averageSpentPerCustomer: 0,
    topCustomer: null
  });
  const [todayStats, setTodayStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    monthlyEarnings: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch today's data
      const today = dayjs().format('YYYY-MM-DD');
      const { data: todaySales, error: todayError } = await supabase
        .from('sales')
        .select(`
          *,
          products (
            name
          )
        `)
        .eq('date', today);

      if (todayError) throw todayError;

      // Calculate today's statistics and monthly earnings
      const todayStats = todaySales.reduce((acc, sale) => {
        const subtotal = sale.quantity * sale.unit_price;
        const discountAmount = sale.discount_type === 'percentage' 
          ? (subtotal * sale.discount_value) / 100 
          : (sale.discount_value || 0);
        const finalAmount = subtotal - discountAmount;
        
        acc.totalSales += finalAmount;
        acc.totalOrders += 1;
        
        return acc;
      }, { totalSales: 0, totalOrders: 0 });

      // Calculate this month's earnings
      const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
      
      const { data: monthSales, error: monthError } = await supabase
        .from('sales')
        .select('*')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (monthError) throw monthError;

      const monthlyEarnings = monthSales.reduce((total, sale) => {
        const subtotal = sale.quantity * sale.unit_price;
        const discountAmount = sale.discount_type === 'percentage' 
          ? (subtotal * sale.discount_value) / 100 
          : (sale.discount_value || 0);
        return total + (subtotal - discountAmount);
      }, 0);

      setTodayStats({
        totalSales: todayStats.totalSales,
        totalOrders: todayStats.totalOrders,
        averageOrderValue: todayStats.totalOrders ? todayStats.totalSales / todayStats.totalOrders : 0,
        monthlyEarnings
      });
      
      // Fetch sales data for the selected date range
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          customers (
            name
          ),
          products (
            name
          )
        `)
        .gte('date', dateRange.startDate.format('YYYY-MM-DD'))
        .lte('date', dateRange.endDate.format('YYYY-MM-DD'))
        .order('date');

      if (salesError) throw salesError;

      // Process daily sales data
      const dailySales = salesData.reduce((acc, sale) => {
        const date = dayjs(sale.date).format('DD MMM');
        const subtotal = sale.quantity * sale.unit_price;
        const discountAmount = sale.discount_type === 'percentage' 
          ? (subtotal * sale.discount_value) / 100 
          : (sale.discount_value || 0);
        const amount = subtotal - discountAmount;
        acc[date] = (acc[date] || 0) + amount;
        return acc;
      }, {});

      // Process monthly sales data
      const monthlySales = salesData.reduce((acc, sale) => {
        const month = dayjs(sale.date).format('MMM YYYY');
        const subtotal = sale.quantity * sale.unit_price;
        const discountAmount = sale.discount_type === 'percentage' 
          ? (subtotal * sale.discount_value) / 100 
          : (sale.discount_value || 0);
        const amount = subtotal - discountAmount;
        acc[month] = (acc[month] || 0) + amount;
        return acc;
      }, {});

      const processedDailySales = Object.entries(dailySales)
        .map(([date, sales]) => ({
          date,
          sales: Number(sales.toFixed(2))
        }))
        .sort((a, b) => dayjs(a.date, 'DD MMM').valueOf() - dayjs(b.date, 'DD MMM').valueOf());

      const processedMonthlySales = Object.entries(monthlySales)
        .map(([month, sales]) => ({
          month,
          sales: Number(sales.toFixed(2))
        }))
        .sort((a, b) => dayjs(a.month, 'MMM YYYY').valueOf() - dayjs(b.month, 'MMM YYYY').valueOf());

      // Calculate customer statistics
      const customerStats = salesData.reduce((acc, sale) => {
        const customerId = sale.customer_id;
        const customerName = sale.customers.name;
        const subtotal = sale.quantity * sale.unit_price;
        const discountAmount = sale.discount_type === 'percentage' 
          ? (subtotal * sale.discount_value) / 100 
          : (sale.discount_value || 0);
        const amount = subtotal - discountAmount;

        if (!acc.customerSpending[customerId]) {
          acc.customerSpending[customerId] = {
            name: customerName,
            total: 0,
            orders: 0
          };
        }

        acc.customerSpending[customerId].total += amount;
        acc.customerSpending[customerId].orders += 1;
        acc.totalSpent += amount;
        acc.totalOrders += 1;

        return acc;
      }, { 
        customerSpending: {}, 
        totalSpent: 0, 
        totalOrders: 0 
      });

      // Find top customer
      const topCustomer = Object.entries(customerStats.customerSpending)
        .sort(([, a], [, b]) => b.total - a.total)[0];

      // Fetch all customers for total count
      const { data: allCustomers, error: customerError } = await supabase
        .from('customers')
        .select('id, created_at');

      if (customerError) throw customerError;

      // Count new vs returning customers
      const newCustomers = allCustomers.filter(c => 
        dayjs(c.created_at).isAfter(dateRange.startDate)
      ).length;

      setCustomerStats({
        totalCustomers: allCustomers.length,
        newCustomers,
        returningCustomers: allCustomers.length - newCustomers,
        averageSpentPerCustomer: customerStats.totalSpent / Object.keys(customerStats.customerSpending).length,
        topCustomer: topCustomer ? {
          name: topCustomer[1].name,
          total: topCustomer[1].total,
          orders: topCustomer[1].orders
        } : null
      });

      setDailySalesData(processedDailySales);
      setMonthlySalesData(processedMonthlySales);
      setTotalSales(customerStats.totalSpent);
      setSalesGrowth(calculateGrowth(processedDailySales));
      
      setCustomerData([
        { name: 'New Customers', value: newCustomers },
        { name: 'Returning Customers', value: allCustomers.length - newCustomers }
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowth = (data) => {
    if (data.length < 2) return 0;
    const currentPeriod = data.slice(-Math.floor(data.length/2));
    const previousPeriod = data.slice(0, Math.floor(data.length/2));
    const currentSum = currentPeriod.reduce((sum, item) => sum + item.sales, 0);
    const previousSum = previousPeriod.reduce((sum, item) => sum + item.sales, 0);
    return previousSum ? ((currentSum - previousSum) / previousSum) * 100 : 0;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h4" component="h1">
          Dashboard Overview
        </Typography>
        <IconButton onClick={fetchDashboardData} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Today's Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(45deg, #1a237e 30%, #283593 90%)'
              : 'linear-gradient(45deg, #42a5f5 30%, #64b5f6 90%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalendarTodayIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Today's Earnings</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                ${todayStats.totalSales.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                From {todayStats.totalOrders} orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(45deg, #004d40 30%, #00695c 90%)'
              : 'linear-gradient(45deg, #26a69a 30%, #4db6ac 90%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ReceiptIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Today's Orders</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {todayStats.totalOrders}
              </Typography>
              <Typography variant="body2">
                Avg. ${todayStats.averageOrderValue.toFixed(2)}/order
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(45deg, #bf360c 30%, #d84315 90%)'
              : 'linear-gradient(45deg, #ff7043 30%, #ff8a65 90%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoneyIcon sx={{ mr: 1 }} />
                <Typography variant="h6">This Month's Earnings</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                ${todayStats.monthlyEarnings.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                {dayjs().format('MMMM YYYY')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(45deg, #1b5e20 30%, #2e7d32 90%)'
              : 'linear-gradient(45deg, #66bb6a 30%, #81c784 90%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Total Customers</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {customerStats.totalCustomers}
              </Typography>
              <Typography variant="body2">
                {customerStats.newCustomers} new this period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Date Range Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <DatePicker
              label="Start Date"
              value={dateRange.startDate}
              onChange={(newValue) => setDateRange(prev => ({ ...prev, startDate: newValue }))}
              renderInput={(params) => <TextField {...params} />}
            />
            <DatePicker
              label="End Date"
              value={dateRange.endDate}
              onChange={(newValue) => setDateRange(prev => ({ ...prev, endDate: newValue }))}
              renderInput={(params) => <TextField {...params} />}
            />
          </Stack>
        </LocalizationProvider>
      </Paper>

      <Grid container spacing={3}>
        {/* Monthly Sales Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Monthly Sales Performance
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={monthlySalesData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Sales ($)"
                    stroke={theme.palette.primary.main}
                    fill={theme.palette.primary.light}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Daily Sales Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Daily Sales Performance
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart
                  data={dailySalesData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="sales" 
                    name="Sales ($)" 
                    fill={theme.palette.primary.main}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Customer Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Customer Distribution
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={customerData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {customerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Top Customer Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Customer
              </Typography>
              {customerStats.topCustomer ? (
                <>
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    {customerStats.topCustomer.name}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total Spent
                      </Typography>
                      <Typography variant="h6">
                        ${customerStats.topCustomer.total.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Orders
                      </Typography>
                      <Typography variant="h6">
                        {customerStats.topCustomer.orders}
                      </Typography>
                    </Grid>
                  </Grid>
                </>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  No customer data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;

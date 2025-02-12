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
  const [activeFilter, setActiveFilter] = useState('30days');
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
  const [deliveryCostsByBusiness, setDeliveryCostsByBusiness] = useState([]);
  const [netIncome, setNetIncome] = useState({
    income: 0,
    expenses: 0,
    deliveryCosts: 0,
    purchases: 0,
    total: 0,
    percentageChange: 0
  });
  const [totalDeliveryCosts, setTotalDeliveryCosts] = useState(0);

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

      // Fetch delivery costs by business
      const { data: deliveryCosts, error: deliveryError } = await supabase
        .from('sales')
        .select(`
          delivery_cost,
          delivery_companies (
            id,
            name
          )
        `)
        .not('delivery_cost', 'is', null)
        .gte('date', dateRange.startDate.format('YYYY-MM-DD'))
        .lte('date', dateRange.endDate.format('YYYY-MM-DD'));

      if (deliveryError) throw deliveryError;

      // Process delivery costs by business
      const costsByBusiness = deliveryCosts.reduce((acc, sale) => {
        if (sale.delivery_companies) {
          const businessName = sale.delivery_companies.name;
          if (!acc[businessName]) {
            acc[businessName] = {
              name: businessName,
              totalCost: 0,
              deliveries: 0
            };
          }
          acc[businessName].totalCost += (sale.delivery_cost || 0);
          acc[businessName].deliveries += 1;
        }
        return acc;
      }, {});

      setDeliveryCostsByBusiness(Object.values(costsByBusiness).sort((a, b) => b.totalCost - a.totalCost));

      // Fetch expenses for the date range
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, date')
        .gte('date', dateRange.startDate.format('YYYY-MM-DD'))
        .lte('date', dateRange.endDate.format('YYYY-MM-DD'));

      if (expensesError) throw expensesError;

      // Fetch purchases for the date range
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('total_amount, date')
        .gte('date', dateRange.startDate.format('YYYY-MM-DD'))
        .lte('date', dateRange.endDate.format('YYYY-MM-DD'));

      if (purchasesError) throw purchasesError;

      // Calculate total expenses
      const totalExpenses = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
      const totalPurchases = purchasesData.reduce((sum, purchase) => sum + purchase.total_amount, 0);
      
      // Calculate total delivery costs
      const totalDeliveryCosts = deliveryCosts.reduce((sum, sale) => sum + (sale.delivery_cost || 0), 0);
      setTotalDeliveryCosts(totalDeliveryCosts);
      
      // Calculate net income
      const totalIncome = customerStats.totalSpent;
      const netTotal = totalIncome - totalExpenses - totalPurchases - totalDeliveryCosts;

      // Calculate percentage change from previous period
      const midPoint = Math.floor(salesData.length / 2);
      const recentPeriod = salesData.slice(-midPoint);
      const previousPeriod = salesData.slice(0, midPoint);

      const recentIncome = recentPeriod.reduce((sum, sale) => sum + sale.total, 0);
      const previousIncome = previousPeriod.reduce((sum, sale) => sum + sale.total, 0);

      const percentageChange = previousIncome === 0 ? 0 : 
        ((recentIncome - previousIncome) / previousIncome) * 100;

      setNetIncome({
        income: totalIncome,
        expenses: totalExpenses,  // Regular expenses without delivery costs
        deliveryCosts: totalDeliveryCosts,  // Separate delivery costs
        purchases: totalPurchases,
        total: netTotal,
        percentageChange
      });

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

  const handleQuickFilter = (filter) => {
    const today = dayjs();
    let startDate, endDate;

    switch (filter) {
      case 'yesterday':
        startDate = today.subtract(1, 'day').startOf('day');
        endDate = today.subtract(1, 'day').endOf('day');
        break;
      case 'lastWeek':
        startDate = today.subtract(1, 'week').startOf('week');
        endDate = today.subtract(1, 'week').endOf('week');
        break;
      case 'thisMonth':
        startDate = today.startOf('month');
        endDate = today;
        break;
      case 'lastMonth':
        startDate = today.subtract(1, 'month').startOf('month');
        endDate = today.subtract(1, 'month').endOf('month');
        break;
      case '30days':
      default:
        startDate = today.subtract(30, 'days');
        endDate = today;
        break;
    }

    setDateRange({ startDate, endDate });
    setActiveFilter(filter);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      mb: 4,
      px: { xs: '0px', sm: 3 }, 
      mx: 'auto', 
      maxWidth: '1200px' 
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        px: { xs: '20px', sm: 0 },
        mb: 3,
        width: '100%'
      }}>
        <Typography variant="h4" component="h1">
          Dashboard Overview
        </Typography>
        <IconButton onClick={fetchDashboardData} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Today's Stats */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(45deg, #1a237e 30%, #283593 90%)'
              : 'linear-gradient(45deg, #42a5f5 30%, #64b5f6 90%)',
            color: 'white',
            mx: { xs: '10px', sm: 0 }, 
            maxWidth: { xs: 'calc(100% - 20px)', sm: 'none' } 
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
            color: 'white',
            mx: { xs: '10px', sm: 0 },
            maxWidth: { xs: 'calc(100% - 20px)', sm: 'none' }
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
            color: 'white',
            mx: { xs: '10px', sm: 0 },
            maxWidth: { xs: 'calc(100% - 20px)', sm: 'none' }
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
            color: 'white',
            mx: { xs: '10px', sm: 0 },
            maxWidth: { xs: 'calc(100% - 20px)', sm: 'none' }
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
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Stack 
              direction={{ xs: 'column', md: 'row' }} 
              spacing={{ xs: 2, md: 3 }} 
              alignItems={{ xs: 'stretch', md: 'center' }}
              divider={<Divider orientation="vertical" flexItem />}
            >
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                sx={{ 
                  minWidth: { sm: '320px' },
                  width: { xs: '100%', md: 'auto' }
                }}
              >
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Start Date"
                    value={dateRange.startDate}
                    onChange={(newValue) => {
                      setDateRange(prev => ({ ...prev, startDate: newValue }));
                      setActiveFilter('custom');
                    }}
                    slotProps={{ 
                      textField: { 
                        size: "small",
                        fullWidth: true,
                        sx: { minWidth: '140px' }
                      } 
                    }}
                  />
                  <DatePicker
                    label="End Date"
                    value={dateRange.endDate}
                    onChange={(newValue) => {
                      setDateRange(prev => ({ ...prev, endDate: newValue }));
                      setActiveFilter('custom');
                    }}
                    slotProps={{ 
                      textField: { 
                        size: "small",
                        fullWidth: true,
                        sx: { minWidth: '140px' }
                      } 
                    }}
                  />
                </LocalizationProvider>
              </Stack>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={1.5}
                sx={{ 
                  flex: 1,
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  gap: '8px',
                  '& > button': {
                    minWidth: { xs: '100%', sm: '110px' },
                    flex: { sm: '0 0 auto' }
                  }
                }}
              >
                <Button
                  variant={activeFilter === 'yesterday' ? 'contained' : 'outlined'}
                  onClick={() => handleQuickFilter('yesterday')}
                  size="small"
                >
                  Yesterday
                </Button>
                <Button
                  variant={activeFilter === 'lastWeek' ? 'contained' : 'outlined'}
                  onClick={() => handleQuickFilter('lastWeek')}
                  size="small"
                >
                  Last Week
                </Button>
                <Button
                  variant={activeFilter === 'thisMonth' ? 'contained' : 'outlined'}
                  onClick={() => handleQuickFilter('thisMonth')}
                  size="small"
                >
                  This Month
                </Button>
                <Button
                  variant={activeFilter === 'lastMonth' ? 'contained' : 'outlined'}
                  onClick={() => handleQuickFilter('lastMonth')}
                  size="small"
                >
                  Last Month
                </Button>
                <Button
                  variant={activeFilter === '30days' ? 'contained' : 'outlined'}
                  onClick={() => handleQuickFilter('30days')}
                  size="small"
                >
                  Last 30 Days
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card sx={{ 
            p: 3,
            mx: { xs: '10px', sm: 0 },
            maxWidth: { xs: 'calc(100% - 20px)', sm: 'none' } 
          }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Monthly Sales Overview</Typography>
            <Grid container spacing={2}>
              {monthlySalesData.map((month, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <Card 
                    elevation={2}
                    sx={{ 
                      p: 2,
                      background: theme.palette.mode === 'dark' 
                        ? 'linear-gradient(45deg, #1a237e 30%, #283593 90%)'
                        : 'linear-gradient(45deg, #42a5f5 30%, #64b5f6 90%)',
                      color: 'white'
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 1 }}>{month.month}</Typography>
                    <Typography variant="h4">${month.sales.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Daily Sales Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: { xs: 1.5, sm: 2 },
            height: '100%',
            mx: { xs: '10px', sm: 0 },
            maxWidth: { xs: 'calc(100% - 20px)', sm: 'none' }
          }}>
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
          <Paper sx={{ 
            p: { xs: 1.5, sm: 2 },
            height: '100%',
            mx: { xs: '10px', sm: 0 },
            maxWidth: { xs: 'calc(100% - 20px)', sm: 'none' }
          }}>
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
          <Card sx={{ 
            p: 3,
            mb: 4,  
            mx: { xs: '10px', sm: 0 },
            maxWidth: { xs: 'calc(100% - 20px)', sm: 'none' },
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(45deg, #1a237e 30%, #283593 90%)'
              : 'linear-gradient(45deg, #42a5f5 30%, #64b5f6 90%)',
            color: 'white'
          }}>
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

      {/* Net Income Card */}
      <Card sx={{ 
        p: 3,
        mb: 4,
        mx: { xs: '10px', sm: 0 },
        maxWidth: { xs: 'calc(100% - 20px)', sm: 'none' },
        background: theme.palette.mode === 'dark' 
          ? netIncome.total >= 0 
            ? 'linear-gradient(45deg, #1b5e20 30%, #2e7d32 90%)'
            : 'linear-gradient(45deg, #b71c1c 30%, #c62828 90%)'
          : netIncome.total >= 0
            ? 'linear-gradient(45deg, #66bb6a 30%, #81c784 90%)'
            : 'linear-gradient(45deg, #ef5350 30%, #e57373 90%)',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" gutterBottom>Net Income</Typography>
            <Typography variant="h3" sx={{ mb: 2 }}>
              ${netIncome.total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {netIncome.percentageChange !== 0 && (
                <>
                  {netIncome.percentageChange > 0 ? (
                    <TrendingUpIcon color="inherit" />
                  ) : (
                    <TrendingDownIcon color="inherit" />
                  )}
                  <Typography variant="body2">
                    {Math.abs(netIncome.percentageChange).toFixed(1)}% from previous period
                  </Typography>
                </>
              )}
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Total Income: ${netIncome.income.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Total Expenses: ${(netIncome.expenses).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Total Delivery Costs: ${netIncome.deliveryCosts.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Typography>
            <Typography variant="body2">
              Total Purchases: ${netIncome.purchases.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* Delivery Costs by Business */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card sx={{ 
            p: 3,
            mx: { xs: '10px', sm: 0 },
            maxWidth: { xs: 'calc(100% - 20px)', sm: 'none' }
          }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Delivery Costs by Business</Typography>
            <Grid container spacing={2}>
              {deliveryCostsByBusiness.map((business, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <Card 
                    elevation={2}
                    sx={{ 
                      p: 2,
                      background: theme.palette.mode === 'dark' 
                        ? 'linear-gradient(45deg, #004d40 30%, #00695c 90%)'
                        : 'linear-gradient(45deg, #26a69a 30%, #4db6ac 90%)',
                      color: 'white'
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 1 }}>{business.name}</Typography>
                    <Typography variant="h4" sx={{ mb: 1 }}>${business.totalCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</Typography>
                    <Typography variant="body2">
                      {business.deliveries} deliveries
                    </Typography>
                    <Typography variant="body2">
                      Avg: ${(business.totalCost / business.deliveries).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}/delivery
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;

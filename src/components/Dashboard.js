import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, CircularProgress } from '@mui/material';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../config/supabase';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [salesGrowth, setSalesGrowth] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch sales data for the last 6 months
      const startDate = dayjs().subtract(5, 'month').startOf('month').format('YYYY-MM-DD');
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('date, quantity, unit_price')
        .gte('date', startDate)
        .order('date');

      if (salesError) throw salesError;

      // Process sales data by month
      const monthlySales = salesData.reduce((acc, sale) => {
        const month = dayjs(sale.date).format('MMM');
        const amount = sale.quantity * sale.unit_price;
        acc[month] = (acc[month] || 0) + amount;
        return acc;
      }, {});

      const processedSalesData = Object.entries(monthlySales).map(([month, sales]) => ({
        month,
        sales: Number(sales.toFixed(2))
      }));

      // Calculate total sales and growth
      const currentMonthSales = monthlySales[dayjs().format('MMM')] || 0;
      const lastMonthSales = monthlySales[dayjs().subtract(1, 'month').format('MMM')] || 0;
      const growth = lastMonthSales ? ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100 : 0;

      // Fetch customer data
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id');

      if (customerError) throw customerError;

      // Get customer purchase data
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('sales')
        .select('customer_id')
        .gte('date', dayjs().subtract(30, 'days').format('YYYY-MM-DD'));

      if (purchaseError) throw purchaseError;

      const newCustomers = customerData.filter(c => 
        !purchaseData.some(p => p.customer_id === c.id)
      ).length;

      const returningCustomers = customerData.length - newCustomers;

      setSalesData(processedSalesData);
      setCustomerData([
        { name: 'New Customers', value: newCustomers },
        { name: 'Returning Customers', value: returningCustomers }
      ]);
      setTotalSales(currentMonthSales);
      setSalesGrowth(growth);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Dashboard Overview
      </Typography>
      
      <Grid container spacing={3}>
        {/* Sales Summary */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: { xs: 'auto', md: 240 },
              minHeight: 200,
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Sales Summary
            </Typography>
            <Typography component="p" variant="h4">
              ${totalSales.toFixed(2)}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              {dayjs().format('DD MMM, YYYY')}
            </Typography>
            <Typography variant="body2" color={salesGrowth >= 0 ? 'success.main' : 'error.main'}>
              {salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}% from last month
            </Typography>
          </Paper>
        </Grid>

        {/* Performance Chart */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: { xs: 300, md: 240 },
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Sales Performance
            </Typography>
            <Box sx={{ width: '100%', height: '100%', minHeight: 200 }}>
              <ResponsiveContainer>
                <LineChart
                  data={salesData}
                  margin={{
                    top: 16,
                    right: 16,
                    bottom: 0,
                    left: 24,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Customer Overview */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: { xs: 300, md: 240 },
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Customer Overview
            </Typography>
            <Box sx={{ width: '100%', height: '100%', minHeight: 200 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={customerData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

        {/* Monthly Revenue */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: { xs: 300, md: 240 },
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Monthly Revenue
            </Typography>
            <Box sx={{ width: '100%', height: '100%', minHeight: 200 }}>
              <ResponsiveContainer>
                <BarChart
                  data={salesData}
                  margin={{
                    top: 16,
                    right: 16,
                    bottom: 0,
                    left: 24,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;

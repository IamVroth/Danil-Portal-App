import React, { createContext, useContext, useState, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';

const ThemeContext = createContext();

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a CustomThemeProvider');
  }
  return context;
};

export const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('dark');

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Light mode
                primary: {
                  main: '#9c27b0',
                  light: '#ba68c8',
                  dark: '#7b1fa2',
                },
                secondary: {
                  main: '#ce93d8',
                },
                background: {
                  default: '#f5f5f9',
                  paper: '#ffffff',
                },
                text: {
                  primary: '#1a1a2e',
                },
              }
            : {
                // Dark mode
                primary: {
                  main: '#9c27b0',
                  light: '#ba68c8',
                  dark: '#7b1fa2',
                },
                secondary: {
                  main: '#ce93d8',
                },
                background: {
                  default: '#1a1a2e',
                  paper: '#232342',
                },
                text: {
                  primary: '#ffffff',
                },
              }),
        },
        components: {
          MuiTableRow: {
            styleOverrides: {
              root: {
                '&:nth-of-type(odd)': {
                  backgroundColor: mode === 'dark' 
                    ? 'rgba(156, 39, 176, 0.05)'
                    : 'rgba(156, 39, 176, 0.02)',
                },
                '&:hover': {
                  backgroundColor: mode === 'dark'
                    ? 'rgba(156, 39, 176, 0.1) !important'
                    : 'rgba(156, 39, 176, 0.04) !important',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
      }),
    [mode]
  );

  const value = {
    mode,
    toggleColorMode,
    theme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// src/tests/test-utils.jsx
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DataProvider, DataContext } from '@/context/DataContext';
import { ToastProvider } from '@shared/components/feedback/ToastProvider';

// This is a comprehensive wrapper that includes all major providers.
// It simplifies test setup by providing a consistent rendering environment.
const AllTheProviders = ({ children, value }) => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <DataContext.Provider value={value}>
          {children}
        </DataContext.Provider>
      </ToastProvider>
    </BrowserRouter>
  );
};

// Custom render function that wraps the UI in the providers.
const customRender = (ui, options = {}) => {
    const { wrapperProps, ...renderOptions } = options;
    const { value, ...restWrapperProps } = wrapperProps || {};

    const renderResult = render(
        ui,
        {
            wrapper: (props) => (
                <AllTheProviders {...props} {...restWrapperProps} value={value} />
            ),
            ...renderOptions,
        }
    );
    return { ...renderResult, rerender: (newUi, newOptions) => customRender(newUi, { container: renderResult.container, ...newOptions }) };
};


// Re-export everything from testing-library
export * from '@testing-library/react';

// Override the default render method with our custom one
export { customRender as render };
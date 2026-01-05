// src/features/companies/hooks/useCompanyDashboard.js

import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@lib/firebase';

export function useCompanyDashboard(companyId) {
  // --- State ---
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Pagination State ---
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // --- Filter & Search State ---
  const [activeTab, setActiveTab] = useState('applications');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
      state: '',
      driverType: '',
      dob: '',
      assignee: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // --- Debounce Search ---
  useEffect(() => {
      const timer = setTimeout(() => {
          setDebouncedSearch(searchQuery);
      }, 800);
      return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- Main Data Fetcher ---
  const fetchData = useCallback(async () => {
      if (!companyId) return;

      setLoading(true);
      setError('');

      try {
          const getLeads = httpsCallable(functions, 'getLeads');
          const result = await getLeads({
              companyId,
              page: currentPage,
              limit: itemsPerPage,
              sortBy,
              sortOrder,
              filters,
              search: debouncedSearch,
              tab: activeTab
          });

          const { leads, total } = result.data;

          setData(leads);
          setTotalCount(total);
          setTotalPages(Math.ceil(total / itemsPerPage) || 1);

      } catch (err) {
          console.error("Dashboard fetch error:", err);
          setError(err.message || "Failed to load data.");
      } finally {
          setLoading(false);
      }
  }, [companyId, activeTab, currentPage, itemsPerPage, debouncedSearch, filters, sortBy, sortOrder]);

  // --- Init & Refresh Effects ---

  // B. Reset Pagination on Tab/Filter Change
  useEffect(() => {
      setCurrentPage(1);
  }, [activeTab, companyId, debouncedSearch, filters]);

  // C. Trigger Data Fetch
  useEffect(() => {
      fetchData();
  }, [fetchData]);

  // --- 6. Handlers ---
  const handleSetItemsPerPage = (num) => {
      setItemsPerPage(num);
      setCurrentPage(1);
  };

  const handleSetFilters = (key, value) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  };

  return {
      // Data
      paginatedData: data,
      loading,
      error,

      // Actions
      refreshData: fetchData,

      // Pagination
      currentPage,
      itemsPerPage,
      totalPages,
      totalCount,

      setItemsPerPage: handleSetItemsPerPage,
      nextPage: () => setCurrentPage(p => p + 1),
      prevPage: () => setCurrentPage(p => Math.max(1, p - 1)),

      // State Controls
      activeTab,
      setActiveTab,
      searchQuery,
      setSearchQuery,
      filters,
      setFilters: handleSetFilters,
      sortBy,
      setSortBy,
      sortOrder,
      setSortOrder
  };
}

// API utility for making authenticated requests

const API_BASE_URL = 'http://localhost:5000/api';

// Get auth headers with token
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Generic fetch wrapper with authentication
export const fetchWithAuth = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });

  // Handle token expiration
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  return response;
};

// API methods
export const api = {
  // Transactions
  getTransactions: () => 
    fetchWithAuth(`${API_BASE_URL}/transactions`),
  
  createTransaction: (data) =>
    fetchWithAuth(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  deleteTransaction: (id) =>
    fetchWithAuth(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE'
    }),

  // Budgets
  getBudgets: () =>
    fetchWithAuth(`${API_BASE_URL}/budgets`),
  
  getBudgetAlerts: () =>
    fetchWithAuth(`${API_BASE_URL}/budgets/alerts`),
  
  createBudget: (data) =>
    fetchWithAuth(`${API_BASE_URL}/budgets`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  updateBudget: (id, data) =>
    fetchWithAuth(`${API_BASE_URL}/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  deleteBudget: (id) =>
    fetchWithAuth(`${API_BASE_URL}/budgets/${id}`, {
      method: 'DELETE'
    }),

  // Bills
  getBills: () =>
    fetchWithAuth(`${API_BASE_URL}/bills`),
  
  getUpcomingBills: () =>
    fetchWithAuth(`${API_BASE_URL}/bills/upcoming`),
  
  createBill: (data) =>
    fetchWithAuth(`${API_BASE_URL}/bills`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  updateBill: (id, data) =>
    fetchWithAuth(`${API_BASE_URL}/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  markBillAsPaid: (id) =>
    fetchWithAuth(`${API_BASE_URL}/bills/${id}/pay`, {
      method: 'PUT'
    }),
  
  deleteBill: (id) =>
    fetchWithAuth(`${API_BASE_URL}/bills/${id}`, {
      method: 'DELETE'
    }),

  // Goals
  getGoals: () =>
    fetchWithAuth(`${API_BASE_URL}/goals`),
  
  createGoal: (data) =>
    fetchWithAuth(`${API_BASE_URL}/goals`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  updateGoal: (id, data) =>
    fetchWithAuth(`${API_BASE_URL}/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  deleteGoal: (id) =>
    fetchWithAuth(`${API_BASE_URL}/goals/${id}`, {
      method: 'DELETE'
    }),
  
  allocateSavings: (data) =>
    fetchWithAuth(`${API_BASE_URL}/goals/allocate`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // AI
  getInsights: (userId) =>
    fetchWithAuth(`${API_BASE_URL}/ai/insights?userId=${userId}`),
  
  getFinancialHealth: (userId, period) =>
    fetchWithAuth(`${API_BASE_URL}/ai/financial-health?userId=${userId}&period=${period}`),
  
  postQuery: (data) =>
    fetchWithAuth(`${API_BASE_URL}/ai/query`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

import { createSlice } from '@reduxjs/toolkit';

const getUserFromStorage = () => {
  try {
    const item = localStorage.getItem('user');
    if (item && item !== 'undefined') {
      return JSON.parse(item);
    }
  } catch (error) {
    console.error('Failed to parse user from localStorage:', error);
  }
  return null;
};

const initialState = {
  user: getUserFromStorage(),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('token', action.payload.token);
    },
    authFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
    updateKYC: (state, action) => {
      if (state.user) {
        state.user.kycStatus = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    updateGamification: (state, action) => {
      if (state.user) {
        state.user.xp = action.payload.xp;
        state.user.coins = action.payload.coins;
        state.user.badge = action.payload.badge;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    // Merge partial user updates (avatar, name, phone, etc.)
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    }
  }
});

export const {
  authStart,
  authSuccess,
  authFailure,
  logout,
  updateKYC,
  updateGamification,
  updateUser
} = authSlice.actions;

export default authSlice.reducer;

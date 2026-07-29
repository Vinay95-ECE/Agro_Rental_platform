import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import OverviewView from './views/OverviewView';
import UserManagementView from './views/UserManagementView';
import KYCManagementView from './views/KYCManagementView';
import ToolManagementView, { ProductManagementView, CropManagementView } from './views/ContentManagementView';
import BookingsView from './views/BookingsView';
import PaymentsView from './views/PaymentsView';
import AnalyticsView from './views/AnalyticsView';
import NotificationsView from './views/NotificationsView';
import SecurityView from './views/SecurityView';

/**
 * AdminDashboard — the main orchestrator for the Super Admin Panel.
 * Wrapped in AdminLayout which provides the sidebar navigation.
 * Tab switching is fully client-side with no page reloads.
 */
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderView = () => {
    switch (activeTab) {
      case 'overview':      return <OverviewView />;
      case 'users':         return <UserManagementView />;
      case 'kyc':           return <KYCManagementView />;
      case 'tools':         return <ToolManagementView />;
      case 'products':      return <ProductManagementView />;
      case 'crops':         return <CropManagementView />;
      case 'bookings':      return <BookingsView />;
      case 'payments':      return <PaymentsView />;
      case 'analytics':     return <AnalyticsView />;
      case 'notifications': return <NotificationsView />;
      case 'security':      return <SecurityView />;
      default:              return <OverviewView />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderView()}
    </AdminLayout>
  );
};

export default AdminDashboard;

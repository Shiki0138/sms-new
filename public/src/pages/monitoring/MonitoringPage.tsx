// Monitoring Dashboard Page
import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import HealthDashboard from '../../components/monitoring/HealthDashboard';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function MonitoringPage() {
  const { currentTenant } = useTenant();

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">テナント情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HealthDashboard tenantId={currentTenant.id} />
      </div>
    </DashboardLayout>
  );
}
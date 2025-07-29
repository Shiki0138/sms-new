import React from 'react';
import ErrorBoundary from '../../components/ErrorBoundary';
import ReservationsPageSimple from './ReservationsPageSimple';

const ReservationsPage: React.FC = () => {
  // 一時的にシンプルなバージョンを使用
  return (
    <ErrorBoundary>
      <ReservationsPageSimple />
    </ErrorBoundary>
  );
};

export default ReservationsPage;

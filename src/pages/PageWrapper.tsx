import React, { Suspense } from 'react';
import PageErrorBoundary from '../components/PageErrorBoundary';
import { PageLoading } from '../components/common/LoadingStates';

interface PageWrapperProps {
  children: React.ReactNode;
  pageName: string;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ children, pageName }) => {
  return (
    <PageErrorBoundary pageName={pageName}>
      <Suspense fallback={<PageLoading page={pageName.toLowerCase()} />}>
        {children}
      </Suspense>
    </PageErrorBoundary>
  );
};

export default PageWrapper;
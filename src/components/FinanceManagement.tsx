import React from 'react';
import FinanceWorkspace from './finance/FinanceWorkspace';

interface FinanceManagementProps {
  requestAdminDelete?: (type: string, id: string, name: string) => void;
  canEdit?: boolean;
  currentUser?: { id?: string; name?: string; username?: string } | null;
}

export default function FinanceManagement(props: FinanceManagementProps) {
  return <FinanceWorkspace {...props} />;
}

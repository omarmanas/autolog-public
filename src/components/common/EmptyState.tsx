import React from 'react';
import { Card, CardProps } from './Card';

export interface EmptyStateProps
  extends Omit<CardProps, 'title' | 'children'> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  ...props
}) => (
  <Card
    {...props}
    className={['ui-empty-state', className].filter(Boolean).join(' ')}
  >
    {icon && (
      <div className="ui-empty-state__icon" aria-hidden="true">
        {icon}
      </div>
    )}
    <h3 className="ui-empty-state__title">{title}</h3>
    {description && (
      <p className="ui-empty-state__description">{description}</p>
    )}
    {action && <div className="ui-empty-state__action">{action}</div>}
  </Card>
);

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'raised';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'surface', className = '', ...props }, ref) => {
    const classes = [
      'ui-card',
      variant === 'raised' ? 'ui-card--raised' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return <div {...props} ref={ref} className={classes} />;
  }
);

Card.displayName = 'Card';

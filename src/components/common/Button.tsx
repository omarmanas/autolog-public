import React from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive';

type ButtonAccessibleName =
  | {
      iconOnly: true;
      'aria-label': string;
    }
  | {
      iconOnly?: false;
      'aria-label'?: string;
    };

export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> &
  ButtonAccessibleName & {
    variant?: ButtonVariant;
    loading?: boolean;
    loadingText?: string;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      loading = false,
      loadingText = 'Loading',
      iconOnly = false,
      disabled,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const classes = [
      'ui-button',
      `ui-button--${variant}`,
      iconOnly ? 'ui-button--icon-only' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <>
            <span className="ui-button__spinner" aria-hidden="true" />
            <span className={iconOnly ? 'ui-visually-hidden' : undefined}>
              {loadingText}
            </span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

import React, { useId } from 'react';

type FormFieldProps = {
  id?: string;
  disabled?: boolean;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: React.AriaAttributes['aria-invalid'];
};

export interface FormControlProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  children: React.ReactElement<FormFieldProps>;
}

export const FormControl: React.FC<FormControlProps> = ({
  label,
  description,
  error,
  required = false,
  disabled = false,
  children,
  className = '',
  ...props
}) => {
  const generatedId = useId();
  const controlId = children.props.id || `field-${generatedId}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [
    children.props['aria-describedby'],
    descriptionId,
    errorId,
  ]
    .filter(Boolean)
    .join(' ');

  const field = React.cloneElement(children, {
    id: controlId,
    disabled: disabled || children.props.disabled,
    required: required || children.props.required,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': error ? true : children.props['aria-invalid'],
  });

  return (
    <div
      {...props}
      className={['ui-form-control', className].filter(Boolean).join(' ')}
      data-disabled={disabled || undefined}
    >
      <label className="ui-form-control__label" htmlFor={controlId}>
        {label}
        {required && (
          <span className="ui-form-control__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {description && (
        <p className="ui-form-control__description" id={descriptionId}>
          {description}
        </p>
      )}
      {field}
      {error && (
        <p className="ui-form-control__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

import React from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

export const Form = ({
  schema,
  onSubmit,
  defaultValues = {},
  children,
  className = '',
  submitLabel = 'Submit',
  loading = false,
  ...props
}) => {
  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSubmit = methods.handleSubmit((data) => {
    onSubmit(data);
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className={className} {...props}>
        {children}
        <div className="mt-6">
          <Button type="submit" loading={loading} className="w-full">
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

// Form Field Components
export const FormField = ({
  name,
  label,
  type = 'text',
  placeholder,
  required = false,
  className = '',
  ...props
}) => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        error={!!errors[name]}
        {...register(name)}
        {...props}
      />
      {errors[name] && (
        <p className="text-sm text-destructive">{errors[name].message}</p>
      )}
    </div>
  );
};

export const FormSelect = ({
  name,
  label,
  options = [],
  placeholder,
  required = false,
  className = '',
  ...props
}) => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <select
        id={name}
        {...register(name)}
        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          errors[name]
            ? "border-destructive focus-visible:ring-destructive"
            : "border-input focus-visible:ring-ring"
        }`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errors[name] && (
        <p className="text-sm text-destructive">{errors[name].message}</p>
      )}
    </div>
  );
};

export const FormTextarea = ({
  name,
  label,
  placeholder,
  required = false,
  rows = 3,
  className = '',
  ...props
}) => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <textarea
        id={name}
        rows={rows}
        placeholder={placeholder}
        className={`flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          errors[name]
            ? "border-destructive focus-visible:ring-destructive"
            : "border-input focus-visible:ring-ring"
        }`}
        {...register(name)}
        {...props}
      />
      {errors[name] && (
        <p className="text-sm text-destructive">{errors[name].message}</p>
      )}
    </div>
  );
};

// Common schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'staff', 'customer'], 'Please select a role'),
});

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  address: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(1, 'SKU is required'),
  price: z.number().min(0, 'Price must be positive'),
  stock: z.number().min(0, 'Stock must be positive'),
  gstRate: z.number().min(0).max(100, 'GST rate must be between 0-100'),
});

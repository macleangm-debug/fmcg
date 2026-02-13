import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Common validation rules
export const validators = {
  required: (value: string | number | null | undefined, fieldName: string = 'This field') => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    return undefined;
  },
  
  email: (value: string) => {
    if (!value) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email';
    return undefined;
  },
  
  minLength: (value: string, min: number, fieldName: string = 'This field') => {
    if (!value) return `${fieldName} is required`;
    if (value.length < min) return `${fieldName} must be at least ${min} characters`;
    return undefined;
  },
  
  maxLength: (value: string, max: number, fieldName: string = 'This field') => {
    if (value && value.length > max) return `${fieldName} must be at most ${max} characters`;
    return undefined;
  },
  
  positiveNumber: (value: string | number, fieldName: string = 'This field') => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return `${fieldName} must be a valid number`;
    if (num < 0) return `${fieldName} must be a positive number`;
    return undefined;
  },
  
  greaterThanZero: (value: string | number, fieldName: string = 'This field') => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return `${fieldName} must be a valid number`;
    if (num <= 0) return `${fieldName} must be greater than zero`;
    return undefined;
  },
  
  integer: (value: string | number, fieldName: string = 'This field') => {
    const num = typeof value === 'string' ? parseInt(value) : value;
    if (isNaN(num)) return `${fieldName} must be a valid number`;
    if (!Number.isInteger(num)) return `${fieldName} must be a whole number`;
    return undefined;
  },
  
  phone: (value: string) => {
    if (!value) return undefined; // Phone is usually optional
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(value)) return 'Please enter a valid phone number';
    return undefined;
  },
  
  url: (value: string) => {
    if (!value) return undefined; // URL is usually optional
    try {
      new URL(value);
      return undefined;
    } catch {
      return 'Please enter a valid URL';
    }
  },
  
  dateNotInPast: (value: Date | string, fieldName: string = 'Date') => {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) return `${fieldName} is invalid`;
    if (date < new Date()) return `${fieldName} cannot be in the past`;
    return undefined;
  },
  
  endDateAfterStart: (startDate: Date | string, endDate: Date | string) => {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    if (end <= start) return 'End date must be after start date';
    return undefined;
  },
};

// Field error component
interface FieldErrorProps {
  error?: string;
  touched?: boolean;
}

export function FieldError({ error, touched }: FieldErrorProps) {
  if (!touched || !error) return null;
  
  return (
    <View style={styles.fieldError}>
      <Ionicons name="alert-circle" size={14} color="#DC2626" />
      <Text style={styles.fieldErrorText}>{error}</Text>
    </View>
  );
}

// Hook for form validation
interface ValidationRule {
  validate: (value: any) => string | undefined;
}

interface FieldConfig {
  [key: string]: ValidationRule[];
}

export function useFormValidation<T extends Record<string, any>>(
  values: T,
  fieldConfig: FieldConfig
) {
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = (field: keyof T) => {
    const rules = fieldConfig[field as string];
    if (!rules) return undefined;
    
    for (const rule of rules) {
      const error = rule.validate(values[field]);
      if (error) return error;
    }
    return undefined;
  };

  const handleBlur = (field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateAll = (): boolean => {
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    const allErrors: Partial<Record<keyof T, string>> = {};
    
    Object.keys(fieldConfig).forEach(field => {
      allTouched[field as keyof T] = true;
      allErrors[field as keyof T] = validateField(field as keyof T);
    });
    
    setTouched(allTouched);
    setErrors(allErrors);
    
    return !Object.values(allErrors).some(error => error !== undefined);
  };

  const resetValidation = () => {
    setErrors({});
    setTouched({});
  };

  const getFieldProps = (field: keyof T) => ({
    error: errors[field],
    touched: touched[field],
    onBlur: () => handleBlur(field),
  });

  return {
    errors,
    touched,
    handleBlur,
    validateAll,
    resetValidation,
    getFieldProps,
    setErrors,
    setTouched,
  };
}

const styles = StyleSheet.create({
  fieldError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
});

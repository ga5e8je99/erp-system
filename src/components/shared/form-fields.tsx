"use client";

import * as React from "react";
import {
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/shared/currency-input";
import { DatePicker } from "@/components/shared/date-picker";
import { cn } from "@/lib/utils";

// 1. Text Input Field
export interface FormInputFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue"> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
  required?: boolean;
}

export function FormInputField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  required,
  className,
  ...props
}: FormInputFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("space-y-1.5", className)}>
          {label && (
            <FormLabel className="text-xs font-semibold text-foreground">
              {label}
              {required && <span className="ms-1 text-destructive">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <Input {...field} {...props} />
          </FormControl>
          {description && (
            <FormDescription className="text-[11px] text-muted-foreground">
              {description}
            </FormDescription>
          )}
          <FormMessage className="text-xs text-destructive" />
        </FormItem>
      )}
    />
  );
}

// 2. Textarea Field
export interface FormTextareaFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<React.ComponentProps<typeof Textarea>, "name" | "defaultValue"> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
  required?: boolean;
}

export function FormTextareaField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  required,
  className,
  ...props
}: FormTextareaFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("space-y-1.5", className)}>
          {label && (
            <FormLabel className="text-xs font-semibold text-foreground">
              {label}
              {required && <span className="ms-1 text-destructive">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <Textarea {...field} {...props} />
          </FormControl>
          {description && (
            <FormDescription className="text-[11px] text-muted-foreground">
              {description}
            </FormDescription>
          )}
          <FormMessage className="text-xs text-destructive" />
        </FormItem>
      )}
    />
  );
}

// 3. Switch Field
export interface FormSwitchFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export function FormSwitchField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  className,
  disabled,
}: FormSwitchFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            "flex flex-row items-center justify-between rounded-lg border border-border p-3 shadow-2xs",
            className
          )}
        >
          <div className="space-y-0.5">
            <FormLabel className="text-xs font-medium text-foreground cursor-pointer">
              {label}
            </FormLabel>
            {description && (
              <FormDescription className="text-[11px] text-muted-foreground">
                {description}
              </FormDescription>
            )}
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

// 4. Checkbox Field
export interface FormCheckboxFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export function FormCheckboxField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  className,
  disabled,
}: FormCheckboxFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            "flex flex-row items-start gap-2 space-y-0 rounded-md p-1",
            className
          )}
        >
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className="text-xs font-medium text-foreground cursor-pointer">
              {label}
            </FormLabel>
            {description && (
              <FormDescription className="text-[11px] text-muted-foreground">
                {description}
              </FormDescription>
            )}
          </div>
        </FormItem>
      )}
    />
  );
}

// 5. Currency Input Field
export interface FormCurrencyFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
  currency?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FormCurrencyField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  currency = "ر.س",
  required,
  disabled,
  className,
}: FormCurrencyFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("space-y-1.5", className)}>
          {label && (
            <FormLabel className="text-xs font-semibold text-foreground">
              {label}
              {required && <span className="ms-1 text-destructive">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <CurrencyInput
              value={field.value}
              onChange={field.onChange}
              currency={currency}
              disabled={disabled}
            />
          </FormControl>
          {description && (
            <FormDescription className="text-[11px] text-muted-foreground">
              {description}
            </FormDescription>
          )}
          <FormMessage className="text-xs text-destructive" />
        </FormItem>
      )}
    />
  );
}

// 6. Date Picker Field
export interface FormDatePickerFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FormDatePickerField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  placeholder,
  required,
  disabled,
  className,
}: FormDatePickerFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("space-y-1.5", className)}>
          {label && (
            <FormLabel className="text-xs font-semibold text-foreground">
              {label}
              {required && <span className="ms-1 text-destructive">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              placeholder={placeholder}
              disabled={disabled}
            />
          </FormControl>
          {description && (
            <FormDescription className="text-[11px] text-muted-foreground">
              {description}
            </FormDescription>
          )}
          <FormMessage className="text-xs text-destructive" />
        </FormItem>
      )}
    />
  );
}

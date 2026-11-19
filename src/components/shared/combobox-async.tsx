"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ComboboxOption<T = any> {
  value: string;
  label: string;
  description?: string;
  raw?: T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ComboboxAsyncProps<T = any> {
  value?: string;
  onChange?: (value: string, option?: ComboboxOption<T>) => void;
  loadOptions: (query: string) => Promise<ComboboxOption<T>[]>;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  initialOption?: ComboboxOption<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ComboboxAsync<T = any>({
  value,
  onChange,
  loadOptions,
  placeholder,
  searchPlaceholder,
  disabled = false,
  className,
  clearable = true,
  initialOption,
}: ComboboxAsyncProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [options, setOptions] = React.useState<ComboboxOption<T>[]>(
    initialOption ? [initialOption] : []
  );
  const [selectedOption, setSelectedOption] = React.useState<ComboboxOption<T> | undefined>(
    initialOption
  );

  const t = useTranslations("forms");

  const displayPlaceholder = placeholder || t("selectPlaceholder");
  const displaySearchPlaceholder = searchPlaceholder || t("searchAsync");

  // Fetch initial/search options with debounce
  React.useEffect(() => {
    let active = true;
    const fetchTimer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await loadOptions(query);
        if (active) {
          setOptions(results);
        }
      } catch (err) {
        console.error("Failed to load options:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(fetchTimer);
    };
  }, [query, loadOptions]);

  // Sync selectedOption when value prop changes
  React.useEffect(() => {
    if (!value) {
      setSelectedOption(undefined);
      return;
    }
    const found = options.find((opt) => opt.value === value);
    if (found) {
      setSelectedOption(found);
    }
  }, [value, options]);

  return (
    <div className={cn("relative flex items-center", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "w-full justify-between h-9 text-xs sm:text-sm font-normal",
                !selectedOption && "text-muted-foreground"
              )}
            >
              <span className="truncate">
                {selectedOption ? selectedOption.label : displayPlaceholder}
              </span>
              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-(--anchor-width) p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={displaySearchPlaceholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
                  <Loader2 className="me-2 h-4 w-4 animate-spin text-primary" />
                  <span>{t("searching")}</span>
                </div>
              ) : options.length === 0 ? (
                <CommandEmpty>{t("noResults")}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        setSelectedOption(option);
                        onChange?.(option.value, option);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between py-2 text-xs sm:text-sm cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="text-[11px] text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4 text-primary shrink-0",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {clearable && selectedOption && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOption(undefined);
            onChange?.("");
          }}
          className="absolute end-7 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

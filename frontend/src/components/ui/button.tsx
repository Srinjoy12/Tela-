import React from "react";
import { Spinner } from "./spinner";

const sizes = [
  {
    tiny: "px-4 h-7 text-xs gap-1.5",
    small: "px-5 h-8 text-sm gap-2",
    medium: "px-6 h-10 text-sm gap-2.5",
    large: "px-8 h-12 text-base gap-3"
  },
  {
    tiny: "w-7 h-7 text-xs",
    small: "w-8 h-8 text-sm",
    medium: "w-10 h-10 text-sm",
    large: "w-12 h-12 text-base"
  }
];

const types = {
  primary: "bg-[#171717] hover:bg-[#333333] text-white fill-white border border-[#171717]",
  secondary: "bg-white hover:bg-[#f5f5f5] text-[#171717] fill-[#171717] border border-[#d4d4d4] shadow-xs",
  tertiary: "bg-transparent hover:bg-[#f0f0f0] text-[#171717] fill-[#171717] border border-transparent",
  error: "bg-[#ea001d] hover:bg-[#ae292f] text-[#f5f5f5] fill-[#f5f5f5] border border-[#ea001d]",
  warning: "bg-[#ff9300] hover:bg-[#d27504] text-[#0a0a0a] fill-[#0a0a0a] border border-[#ff9300]"
};

const shapes = {
  square: {
    tiny: "rounded",
    small: "rounded-md",
    medium: "rounded-md",
    large: "rounded-lg"
  },
  circle: {
    tiny: "rounded-full",
    small: "rounded-full",
    medium: "rounded-full",
    large: "rounded-full"
  },
  rounded: {
    tiny: "rounded-full",
    small: "rounded-full",
    medium: "rounded-full",
    large: "rounded-full"
  }
};

export type ButtonVariant = keyof typeof types;

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'prefix'> {
  size?: keyof typeof sizes[0];
  type?: ButtonVariant | 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;
  shape?: keyof typeof shapes;
  svgOnly?: boolean;
  children?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  shadow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
  onClick?: (e?: any) => void;
  className?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  size = "medium",
  type = "primary",
  variant,
  shape = "square",
  svgOnly = false,
  children,
  prefix,
  suffix,
  shadow = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  htmlType,
  onClick,
  className = "",
  ...rest
}, ref) => {
  // Determine variant: explicit variant prop wins, otherwise check type prop
  let resolvedVariant: ButtonVariant = "primary";
  if (variant && types[variant]) {
    resolvedVariant = variant;
  } else if (type && types[type as ButtonVariant]) {
    resolvedVariant = type as ButtonVariant;
  }

  // Determine native HTML button type
  const nativeButtonType: 'button' | 'submit' | 'reset' = 
    htmlType || 
    (type === 'submit' || type === 'reset' || type === 'button' ? type : 'button');

  return (
    <button
      ref={ref}
      type={nativeButtonType}
      disabled={disabled || loading}
      onClick={onClick}
      tabIndex={0}
      className={`inline-flex justify-center items-center font-medium cursor-pointer select-none duration-150 ${sizes[+svgOnly][size]} ${(disabled || loading) ? "bg-[#f2f2f2] text-[#8f8f8f] fill-[#8f8f8f] border border-[#ebebeb] cursor-not-allowed" : types[resolvedVariant]} ${shapes[shape][size]}${shadow ? " shadow-[0_0_0_1px_#00000014,_0px_2px_2px_#0000000a]" : ""}${fullWidth ? " w-full" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 ${className}`}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === "large" ? 20 : size === "tiny" ? 14 : 16} />
      ) : prefix}
      {children && (
        <span className="truncate">
          {children}
        </span>
      )}
      {!loading && suffix}
    </button>
  );
});
Button.displayName = "Button";

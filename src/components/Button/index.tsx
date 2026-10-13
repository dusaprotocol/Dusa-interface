import React, { useContext } from 'react';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import ConnectButton from 'components/ConnectButton';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import './index.scss';
import { SettingsContext } from 'context/SettingsContext';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  variant: 'contained' | 'outlined' | 'text';
  stretch?: boolean;
  icon?: IconDefinition;
  pending?: boolean;
  disabledText?: string;
  children?: React.ReactNode;
  needConnect?: boolean;
  onClick?:
    | React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
    | (() => void);
}

const Button = ({
  text,
  variant,
  stretch = true,
  icon,
  onClick,
  pending,
  disabled,
  disabledText,
  children,
  needConnect = false,
  ...props
}: ButtonProps) => {
  const _disabled = !!disabledText || disabled;
  const { interfaceTheme } = useContext(SettingsContext);
  const isWinter = interfaceTheme === 'Winter';

  const { connected } = useContext(AccountWrapperContext);
  if (needConnect && !connected) {
    return <ConnectButton />;
  }

  return (
    <button
      {...props}
      disabled={_disabled || pending}
      className={clsx(
        'Button',
        variant,
        stretch && 'stretched',
        isWinter && variant !== 'text' && 'winter',
        variant === 'text' && 'text-[var(--secondary-color)]',
        props.className
      )}
      onClick={onClick}
    >
      {pending && <Spinner size={25} />}
      {icon && <FontAwesomeIcon icon={icon} className='icon' />}
      <span>{_disabled ? disabledText || text : text}</span>
      {children}
    </button>
  );
};

export default Button;

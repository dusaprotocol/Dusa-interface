import { useState, useRef, useEffect } from 'react';
import {
  faCircleQuestion,
  IconDefinition
} from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import { createPortal } from 'react-dom';
import './index.scss';
import { Position } from 'utils/types';

interface SimpleTooltipProps {
  title: string;
  description: string;
  position?: Position;
  type?: 'icon' | 'underline';
  icon?: IconDefinition;
}

export const SimpleTooltip = ({
  title,
  description,
  position,
  type = 'icon',
  icon = faCircleQuestion
}: SimpleTooltipProps) => {
  const iconTrigger = <FontAwesomeIcon className='icon' icon={icon} />;
  const underlineTrigger = <u>{title}</u>;
  const trigger = type === 'icon' ? iconTrigger : underlineTrigger;
  const content = <div style={{ textAlign: 'left' }}>{description}</div>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      {type === 'icon' ? <span className='title'>{title}</span> : null}
      <Tooltip trigger={trigger} position={position}>
        {content}
      </Tooltip>
    </div>
  );
};

interface TooltipProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  position?: Position;
  className?: string;
  classNameTrigger?: string;
}

const Tooltip = ({
  trigger,
  children,
  position = 'right',
  className,
  classNameTrigger
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 5;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + 5;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - 5;
        break;
      case 'right':
      default:
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + 5;
        break;
    }

    // Keep tooltip within viewport bounds
    const padding = 10;
    top = Math.max(
      padding,
      Math.min(top, window.innerHeight - tooltipRect.height - padding)
    );
    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - tooltipRect.width - padding)
    );

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();

      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div
        className={clsx('Tooltip', classNameTrigger)}
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className='Tooltip-trigger'>{trigger}</div>
      </div>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className={clsx('Tooltip-portal-content', position, className)}
            style={{
              position: 'fixed',
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              zIndex: 10000
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
};

export default Tooltip;

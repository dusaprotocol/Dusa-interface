import { useEffect, useState } from 'react';
import clsx from 'clsx/lite';

interface CompletionBarProps {
  percentage: number;
  variant?: 'normal' | 'small';
}

const CompletionBar = ({
  percentage,
  variant = 'normal'
}: CompletionBarProps) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setWidth(percentage), 50);
    return () => clearTimeout(timeout);
  }, [percentage]);

  return (
    <div
      className={clsx(
        'relative w-full overflow-hidden rounded-full bg-[#ffffff0e]',
        variant === 'small' ? 'h-2' : 'h-3'
      )}
    >
      <div
        className='h-full rounded-[0.25rem] bg-[var(--green)] transition-all duration-[1500ms] ease-out'
        style={{
          width: `${width}%`
        }}
      />
    </div>
  );
};

export default CompletionBar;

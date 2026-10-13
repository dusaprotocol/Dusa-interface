import React, { useState, useMemo, useEffect, useRef } from 'react';
import { faCalendarDays } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { usePopper } from 'react-popper';
import { ONE_MINUTE } from 'utils/constants';

interface Props {
  date: Date;
  setDate: (date: Date) => void;
  yearRange?: number;
  buttonClassName?: string;
  popperClassName?: string;
  placement?: 'top-start' | 'bottom-start' | 'top' | 'bottom';
  showTimeOnly?: boolean;
}

export const DateTimePicker: React.FC<Props> = ({
  date,
  setDate,
  yearRange = 2,
  buttonClassName = 'flex items-center rounded-lg border border-[var(--border-color)] bg-[var(--container-bg)] px-4 py-2 text-left text-white hover:brightness-125 focus:outline-none',
  popperClassName = 'z-50 w-80 max-w-[90vw] rounded-lg border border-[var(--border-color)] bg-[var(--hover-bg)] p-4 shadow-lg',
  placement = 'top-start',
  showTimeOnly = false
}) => {
  const now = new Date(new Date().getTime() + ONE_MINUTE);
  const [selectedDate, setSelectedDate] = useState<Date>(date);
  const [selHour, setSelHour] = useState(now.getHours());
  const [selMinute, setSelMinute] = useState(now.getMinutes());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(date.getMonth());
  const [open, setOpen] = useState(false);

  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [popperRef, setPopperRef] = useState<HTMLDivElement | null>(null);
  const { styles, attributes } = usePopper(buttonRef, popperRef, {
    placement,
    modifiers: [
      { name: 'preventOverflow', options: { padding: 8 } },
      { name: 'flip', options: { fallbackPlacements: ['bottom'] } },
      { name: 'offset', options: { offset: [0, 8] } }
    ]
  });

  const popperContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popperContainerRef.current &&
        !popperContainerRef.current.contains(e.target as Node) &&
        buttonRef &&
        !buttonRef.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [buttonRef]);

  useEffect(() => {
    const full = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selHour,
      selMinute
    );
    setDate(full);
  }, [selectedDate, selHour, selMinute, setDate]);

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const offset = (first.getDay() + 6) % 7; // aligne sur Lun
    const dim = daysInMonth(viewYear, viewMonth);
    const total = Math.ceil((offset + dim) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = i - offset + 1;
      return d > 0 && d <= dim ? new Date(viewYear, viewMonth, d) : null;
    });
  }, [viewYear, viewMonth]);

  const hours = useMemo(() => {
    if (!selectedDate) return Array.from({ length: 24 }, (_, i) => i);
    const start =
      selectedDate.toDateString() === now.toDateString() ? now.getHours() : 0;
    return Array.from({ length: 24 - start }, (_, i) => start + i);
  }, [selectedDate, now]);
  const minutes = useMemo(() => {
    if (!selectedDate) return Array.from({ length: 60 }, (_, i) => i);
    const nowH = now.getHours();
    const start =
      selectedDate.toDateString() === now.toDateString() && selHour === nowH
        ? now.getMinutes()
        : 0;
    return Array.from({ length: 60 - start }, (_, i) => start + i);
  }, [selectedDate, selHour, now]);

  const prevMonth = () => {
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return;
    if (viewMonth === 0) {
      setViewYear((v) => v - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const maxY = now.getFullYear() + yearRange;
    if (viewYear === maxY && viewMonth === 11) return;
    if (viewMonth === 11) {
      setViewYear((v) => v + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  return (
    <>
      <div>
        <button
          ref={setButtonRef}
          onClick={() => setOpen((o) => !o)}
          className={buttonClassName}
        >
          <FontAwesomeIcon icon={faCalendarDays} className='mr-2' />
          <span>
            {showTimeOnly
              ? `${String(selHour).padStart(2, '0')}:${String(selMinute).padStart(2, '0')}`
              : `${selectedDate.toLocaleDateString('fr-FR')} ${String(selHour).padStart(2, '0')}:${String(selMinute).padStart(2, '0')}`}
          </span>
        </button>
      </div>

      {open && (
        <div
          ref={(ref) => {
            setPopperRef(ref);
            popperContainerRef.current = ref;
          }}
          style={styles.popper}
          {...attributes.popper}
          className={popperClassName}
        >
          {!showTimeOnly && (
            <>
              <div className='flex justify-between items-center mb-2'>
                <button
                  onClick={prevMonth}
                  className='hover:bg-[var(--container-bg)] p-1 rounded'
                >
                  ‹
                </button>
                <span className='font-medium'>
                  {viewYear} – {String(viewMonth + 1).padStart(2, '0')}
                </span>
                <button onClick={nextMonth} className='p-1 rounded'>
                  ›
                </button>
              </div>

              <div className='grid grid-cols-7 mb-1 text-gray-600 text-xs text-center'>
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                  <div key={d} className='font-semibold'>
                    {d}
                  </div>
                ))}
              </div>

              <div className='gap-1 grid grid-cols-7 mb-4'>
                {calendarDays.map((dt, i) => {
                  const disabled =
                    !dt ||
                    dt <
                      new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate()
                      );
                  const sel =
                    dt &&
                    selectedDate &&
                    dt.toDateString() === selectedDate.toDateString();
                  return (
                    <button
                      key={i}
                      disabled={disabled}
                      onClick={() => dt && setSelectedDate(dt)}
                      className={`
                        h-8 flex items-center justify-center rounded
                        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[var(--secondary-color)] hover:brightness-110'}
                        ${sel ? 'bg-[var(--secondary-color)] text-white' : ''}
                      `}
                    >
                      {dt?.getDate() || ''}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {selectedDate && (
            <div className='gap-2 grid grid-cols-2 mb-4'>
              <div>
                <label className='block mb-1 text-sm'>Heure</label>
                <select
                  className='bg-transparent px-2 py-1 border border-white/80 rounded focus:outline-none w-full cursor-pointer'
                  value={selHour}
                  onChange={(e) => setSelHour(+e.target.value)}
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block mb-1 text-sm'>Minute</label>
                <select
                  className='bg-transparent px-2 py-1 border border-white/80 rounded focus:outline-none w-full cursor-pointer'
                  value={selMinute}
                  onChange={(e) => setSelMinute(+e.target.value)}
                >
                  {minutes.map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className='flex justify-end space-x-2'>
            <button
              onClick={() => setOpen(false)}
              className='hover:bg-[var(--container-bg)] hover:brightness-150 px-3 py-1 rounded-md'
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

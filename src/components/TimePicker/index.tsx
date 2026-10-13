import clsx from 'clsx/lite';
import { NumberWindow, TWindow, WeekWindow } from 'utils/types';
import './index.scss';

interface TimePickerProps<T extends TWindow> {
  values: T[];
  timeWindow: T;
  setTimeWindow: React.Dispatch<React.SetStateAction<T>>;
}

const TimePicker = <T extends TWindow>({
  values,
  timeWindow,
  setTimeWindow
}: TimePickerProps<T>) => {
  return (
    <div className='time-window-select'>
      {values.map((window, index) => {
        const isByNumber = isNumberWindow(window);
        const isByWeek = !isByNumber && isWeekWindow(window);
        return (
          <button
            key={index}
            className={clsx(timeWindow === window && 'active')}
            onClick={() => setTimeWindow(window)}
          >
            {window}
            {!isByNumber ? (isByWeek ? 'W' : 'D') : ''}
          </button>
        );
      })}
    </div>
  );
};

export default TimePicker;

function isNumberWindow(value: number | string): value is NumberWindow {
  return (
    value === NumberWindow.BASE ||
    value === NumberWindow.MID ||
    value === NumberWindow.ALL
  );
}

function isWeekWindow(value: number): value is WeekWindow {
  return (
    value === WeekWindow.QUARTER ||
    value === WeekWindow.HALF_YEAR ||
    value === WeekWindow.YEAR
  );
}

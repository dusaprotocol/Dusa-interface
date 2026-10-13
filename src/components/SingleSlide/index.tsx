import { useState } from 'react';
import './index.scss';

interface SingleSliderProps {
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
}

const SingleSlider = ({ value, setValue }: SingleSliderProps) => {
  const [valueDisplayed, setValueDisplayed] = useState<string>(
    value.toString()
  );
  return (
    <div className='SingleSlide'>
      <div className='slide-row'>
        <div className='slide-col'>
          <input
            className='slide-range-input'
            type='range'
            min={0}
            max={100}
            value={value}
            onChange={(e) => {
              const val = e.target.value;
              setValue(parseInt(val));
              setValueDisplayed(val);
            }}
          />

          <div className='preselected-values' style={{ left: `${value}%` }}>
            {[25, 50, 75, 100].map((val, i) => (
              <div
                key={i}
                className='preselected-value'
                onClick={() => {
                  setValue(val);
                  setValueDisplayed(val.toString());
                }}
              >
                {val}%
              </div>
            ))}
          </div>
        </div>
        <div className='slide-value-input-container'>
          <input
            className='slide-value-input'
            type='number'
            step={1}
            value={valueDisplayed}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (e.target.value === '') {
                setValueDisplayed('');
                setValue(50);
                return;
              }
              if (isNaN(val)) return;
              if (val >= 0 && val <= 100) {
                setValue(val);
                setValueDisplayed(val.toString());
              }
            }}
            onBlur={(e) => {
              if (e.target.value === '') {
                setValueDisplayed('50');
                setValue(50);
              }
            }}
          />
          <span>%</span>
        </div>
      </div>
    </div>
  );
};

export default SingleSlider;

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import debounce from 'lodash.debounce';
import Input from 'components/Input';
import { PoolContext } from 'pages/Pool';
import { getIdFromPrice, getPriceFromId, minmax } from 'utils/methods';
import './index.scss';

interface RangeSliderProps {
  value: [number, number];
  setValue: React.Dispatch<React.SetStateAction<[number, number]>>;
  min: number;
  max: number;
}

const RangeSlider = ({ value, setValue, min, max }: RangeSliderProps) => {
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [numBins, setNumBins] = useState<string>('');
  const [previousInvertPrice, setPreviousInvertPrice] = useState(false);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const [instantValue, setInstantValue] = useState<[number, number]>([
    value[0],
    value[1]
  ]);

  const { token0, token1, binStep, invertPrice } = useContext(PoolContext);

  const denominator = max - min === 0 ? 1 : max - min;
  const minPos = minmax(((instantValue[0] - min) / denominator) * 100, 0, 100);
  const maxPos = minmax(
    max == min ? 100 : ((instantValue[1] - min) / denominator) * 100,
    0,
    100
  );

  const debounceMinChange = debounce((_val: number) => {
    const newMinVal = Math.min(_val, value[1]);
    if (value[1] - newMinVal > 1001) {
      setValue([newMinVal, newMinVal + 1000]);
      return;
    }
    setValue([newMinVal, value[1]]);
  }, 750);

  const debounceSetMinChange = useCallback(
    (val: number) => debounceMinChange(val),
    [value]
  );

  const debounceMaxChange = debounce((_val: number) => {
    const newMaxVal = Math.max(_val, value[0]);
    if (newMaxVal - value[0] > 1001) {
      setValue([newMaxVal - 1000, newMaxVal]);
      return;
    }
    setValue((prev) => [prev[0], newMaxVal]);
  }, 750);

  const debounceSetMaxChange = useCallback(
    (val: number) => debounceMaxChange(val),
    [value]
  );

  const debounceFct = debounce((_val: number) => {
    const val = minmax(_val, 1, 1001);

    const newMaxVal = value[0] + val - 1;
    setValue((prev) => [prev[0], newMaxVal]);
  }, 750);

  const debounceSetValue = useCallback(
    (val: number) => debounceFct(val),
    [value]
  );

  useEffect(() => {
    if (!value[0] || !value[1]) return;
    setInstantValue([value[0], value[1]]);
  }, [value]);

  useEffect(() => {
    if (minRef.current && instantValue[0]) {
      minRef.current.value = instantValue[0].toString();
    }
    if (maxRef.current && instantValue[1]) {
      maxRef.current.value = instantValue[1].toString();
    }
  }, [instantValue]);

  useEffect(() => {
    if (Number.isNaN(value[0])) setValue([min, value[1]]);
    if (Number.isNaN(value[1])) setValue([value[0], max]);
    setMinPrice(
      invertPrice
        ? getPriceFromId(value[0], binStep) *
            10 ** (token0.decimals - token1.decimals)
        : 1 /
            getPriceFromId(value[0], binStep) /
            10 ** (token0.decimals - token1.decimals)
    );
    setMaxPrice(
      invertPrice
        ? getPriceFromId(value[1], binStep) *
            10 ** (token0.decimals - token1.decimals)
        : 1 /
            getPriceFromId(value[1], binStep) /
            10 ** (token0.decimals - token1.decimals)
    );
    setNumBins((value[1] - value[0] + 1).toString());
  }, [value]);

  useEffect(() => {
    if (minPrice === 0 || maxPrice === 0) return;

    if (invertPrice) {
      setMinPrice(previousInvertPrice ? 1 / minPrice : minPrice);
      setMaxPrice(previousInvertPrice ? 1 / maxPrice : maxPrice);
    } else {
      setMinPrice(previousInvertPrice ? minPrice : 1 / minPrice);
      setMaxPrice(previousInvertPrice ? maxPrice : 1 / maxPrice);
    }
    setPreviousInvertPrice(!previousInvertPrice);
  }, [invertPrice]);

  return (
    <div className='RangeSlider-wrapper'>
      <div className='RangeSlider'>
        <div className='control-wrapper'>
          <div className='control' style={{ left: `${minPos}%` }} />
          <div className='rail'>
            <div
              className='inner-rail'
              style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }}
            />
          </div>
          <div className='control' style={{ left: `${maxPos}%` }} />
        </div>
        <div className='input-wrapper'>
          <input
            ref={minRef}
            type='range'
            min={min}
            max={max}
            onChange={(e) => {
              setInstantValue([parseInt(e.target.value), value[1]]);
              debounceSetMinChange(parseInt(e.target.value));
            }}
          />
          <input
            ref={maxRef}
            type='range'
            min={min}
            max={max}
            onChange={(e) => {
              setInstantValue([value[0], parseInt(e.target.value)]);
              debounceSetMaxChange(parseInt(e.target.value));
            }}
          />
          <div className='line-separator'>
            <span>{token1.symbol}</span>
            <span>{token0.symbol}</span>
          </div>
        </div>
      </div>

      <div className='RangeInputs'>
        <div className='range-slider-detail'>
          <span>Min Price:</span>
          <span>
            <Input
              value={minPrice}
              onChange={(e) => setMinPrice(parseFloat(e.target.value))}
              min={0}
              onBlur={(e) => {
                const v = invertPrice
                  ? parseFloat(e.target.value) /
                    10 ** (token0.decimals - token1.decimals)
                  : 1 /
                    parseFloat(e.target.value) /
                    10 ** (token0.decimals - token1.decimals);

                const val = getIdFromPrice(v, binStep);
                setValue([
                  Number.isFinite(val) && val > 0 ? val : min,
                  value[1]
                ]);
              }}
              label={`${(invertPrice ? token1 : token0).symbol} per ${
                (invertPrice ? token0 : token1).symbol
              }`}
            />
          </span>
        </div>
        <div className='range-slider-detail'>
          <span>Max Price:</span>
          <span>
            <Input
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
              min={0}
              onBlur={(e) => {
                const v = invertPrice
                  ? parseFloat(e.target.value) /
                    10 ** (token0.decimals - token1.decimals)
                  : 1 /
                    parseFloat(e.target.value) /
                    10 ** (token0.decimals - token1.decimals);

                const val = getIdFromPrice(v, binStep);
                setValue([
                  value[0],
                  Number.isFinite(val) && val > 0 ? val : max
                ]);
              }}
              label={`${(invertPrice ? token1 : token0).symbol} per ${
                (invertPrice ? token0 : token1).symbol
              }`}
            />
          </span>
        </div>
        <div className='range-slider-detail'>
          <span>Num Bins:</span>
          <Input
            value={numBins}
            placeholder='0'
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!e.target.value) {
                setNumBins('');
                return;
              }
              setNumBins(val.toString());
              if (val > 1001) {
                debounceSetValue(1001);
                return;
              } else if (val < 1) {
                debounceSetValue(1);
                return;
              }
              debounceSetValue(val);
            }}
            onBlur={(e) =>
              !e.target.value && setValue([value[0], value[0] + 30])
            }
          />
        </div>
      </div>
    </div>
  );
};

export default RangeSlider;

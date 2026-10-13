import { useState, useEffect } from 'react';
import useSalesContracts from 'hooks/sale/useSalesContracts';
import { JELLY } from 'utils/tokens';
import CompletionBar from './CompletionBar';

const NB_SALES = 8;
const TOTAL_DUSA_100_PERCENT = 500_000n * BigInt(10 ** JELLY.decimals);
const TOTAL_DUSA_SENT_TO_SCs = 100_000_000_000_000_000_000_000_000n;

const SaleHeader = () => {
  const { sum_sales_dusa_remaining } = useSalesContracts();

  const sold = sum_sales_dusa_remaining
    ? TOTAL_DUSA_SENT_TO_SCs - sum_sales_dusa_remaining
    : 0n;

  const pctBigInt = (sold * 100n) / TOTAL_DUSA_SENT_TO_SCs;
  // const completionPercentage = Math.min(Number(pctBigInt), 100);
  const completionPercentage = 80;

  const [displayedPct, setDisplayedPct] = useState(0);

  useEffect(() => {
    setDisplayedPct(0);

    const duration = 1500;
    const frameRate = 60;
    const totalFrames = Math.round((duration / 1000) * frameRate);
    const increment = completionPercentage / totalFrames;

    let frame = 0;
    const handle = window.setInterval(() => {
      frame++;
      const next = Math.min(
        Math.round(increment * frame),
        completionPercentage
      );
      setDisplayedPct(next);

      if (frame >= totalFrames) {
        window.clearInterval(handle);
      }
    }, duration / totalFrames);

    return () => window.clearInterval(handle);
  }, [completionPercentage]);

  return (
    <div className='sale__header'>
      <h1 className='text-center text-5xl'>Invest in Dusa</h1>
      <p className='sale__dates'>June 27 - July 4</p>

      <CompletionBar percentage={completionPercentage} />

      <span className='text-center font-light italic'>
        {displayedPct}% of the sale completed
      </span>
    </div>
  );
};

export default SaleHeader;

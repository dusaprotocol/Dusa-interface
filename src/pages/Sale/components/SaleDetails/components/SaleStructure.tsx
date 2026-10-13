import clsx from 'clsx/lite';
import SaleDetailSection from './SaleDetailSection';

const rows = [
  {
    label: 'Sale Date',
    value: 'May 24, 2025, 17:00 UTC – June 3, 2025, 17:00 UTC'
  },
  { label: 'Token Price', value: '0.002$ - 0.15$' },
  { label: 'Fully Diluted Value', value: '$15,000,000.00' },
  { label: 'Vesting Schedule', value: 'No vesting - 6 months linear release' },
  { label: '% of Supply Allocated', value: '5.50% - 6.50%' },
  { label: 'Allocated Supply', value: '5,500,000 - 6,500,000 DUSA Tokens' },
  { label: 'Token Total Supply', value: '100,000,000 DUSA Tokens' },
  {
    label: 'Purchase Limits',
    value: (
      <>
        Minimum: 50 USDC – Maximum: 10k USDC
        <br />
        Minimum: 2k MAS – Maximum: 200k MAS
      </>
    )
  },
  { label: 'Accepted Currencies', value: 'MAS, USDC (Massa & BNB chains)' }
];

const SaleStructure = () => (
  <SaleDetailSection title='Sale Structure'>
    <div className='grid gap-4 sm:gap-0'>
      {rows.map(({ label, value }, i) => (
        <div
          key={label}
          className={clsx(
            'grid grid-cols-1 border border-[#ffffff99] p-4 sm:grid-cols-2',
            i < rows.length - 1 && 'sm:border-b-0'
          )}
        >
          <div className='text-xl font-bold text-[var(--secondary-color)] brightness-125'>
            {label}
          </div>
          <div className='text-xl'>{value}</div>
        </div>
      ))}
    </div>
  </SaleDetailSection>
);

export default SaleStructure;

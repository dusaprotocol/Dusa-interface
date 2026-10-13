import { ReactNode } from 'react';
import clsx from 'clsx/lite';
import SaleDetailSection from './SaleDetailSection';

type Row = { label: string; value: ReactNode };
type Round = { name: string; rows: Row[] };

const baseRows: Row[][] = [
  [
    {
      label: 'Date',
      value: 'May 24, 2025, 17:00 UTC – June 3, 2025, 17:00 UTC'
    },
    { label: 'Price', value: '0.10$' },
    {
      label: 'Vesting',
      value: '25% at TGE, 25% after 6 months, 50% after 12 months'
    },
    { label: 'Total Supply', value: '2.2% – 2.4%' },
    {
      label: 'Purchase Limits',
      value: (
        <>
          Min: 75 USDC, Max: 20 000 USDC
          <br />
          Min: 500 MAS, Max: 75 000 MAS
        </>
      )
    }
  ],
  [
    {
      label: 'Date',
      value: 'May 24, 2025, 17:00 UTC – June 3, 2025, 17:00 UTC'
    },
    { label: 'Price', value: '0.10$' },
    {
      label: 'Vesting',
      value: '25% at TGE, 25% after 6 months, 50% after 12 months'
    },
    { label: 'Total Supply', value: '2.2% – 2.4%' },
    {
      label: 'Purchase Limits',
      value: (
        <>
          Min: 75 USDC, Max: 20 000 USDC
          <br />
          Min: 500 MAS, Max: 75 000 MAS
        </>
      )
    }
  ],
  [
    {
      label: 'Date',
      value: 'May 24, 2025, 17:00 UTC – June 3, 2025, 17:00 UTC'
    },
    { label: 'Price', value: '0.10$' },
    {
      label: 'Vesting',
      value: '25% at TGE, 25% after 6 months, 50% after 12 months'
    },
    { label: 'Total Supply', value: '2.2% – 2.4%' },
    {
      label: 'Purchase Limits',
      value: (
        <>
          Min: 75 USDC, Max: 20 000 USDC
          <br />
          Min: 500 MAS, Max: 75 000 MAS
        </>
      )
    }
  ]
];

const rounds: Round[] = [
  { name: 'Seed Round', rows: baseRows[0] },
  { name: 'Public 1 Round', rows: baseRows[1] },
  { name: 'Public 2 Round', rows: baseRows[2] }
];

const RowItem = ({ label, value, isLast }: Row & { isLast: boolean }) => (
  <div
    className={clsx(
      'grid grid-cols-1 border border-[#ffffff99] p-4 sm:grid-cols-2',
      !isLast && 'sm:border-b-0'
    )}
  >
    <div className='text-xl font-bold text-[var(--secondary-color)] brightness-125'>
      {label}
    </div>
    <div className='text-xl'>{value}</div>
  </div>
);

const SaleRounds = () => (
  <SaleDetailSection title='Sale Rounds'>
    <div className='flex flex-col gap-24'>
      {rounds.map(({ name, rows }) => (
        <div key={name} className='grid gap-4 sm:gap-0'>
          <h3 className='text-primary mb-2 text-2xl font-semibold'>{name}</h3>

          {rows.map((row, i) => (
            <RowItem key={row.label} {...row} isLast={i === rows.length - 1} />
          ))}
        </div>
      ))}
    </div>
  </SaleDetailSection>
);

export default SaleRounds;

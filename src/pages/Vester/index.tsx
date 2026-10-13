import PageHeader from 'components/PageHeader';
import ErrorPage from 'pages/ErrorPage';
import { FEATURE_FLAGS } from 'utils/config';
import ManageDusa from './components/ManageDusa';

const Vester = () => {
  if (!FEATURE_FLAGS.VESTER) return <ErrorPage />;
  return (
    <div className='flex w-full flex-col'>
      <PageHeader
        title='Dusa Vester'
        description='Get your DUSA tokens by claiming them through vesting.'
      />
      <div className='flex w-full grow bg-[var(--secondary-bg)] py-8'>
        <div className='mx-auto my-0 flex w-full max-w-[1400px] flex-col gap-8 px-4'>
          <ManageDusa />
        </div>
      </div>
    </div>
  );
};

export default Vester;

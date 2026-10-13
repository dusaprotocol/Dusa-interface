const SoldOutBanner = () => {
  return (
    <div className='absolute inset-0 z-10 flex items-center justify-center'>
      <div className='relative flex h-full w-full items-center justify-center'>
        <div className='absolute inset-0 rounded-xl bg-[var(--secondary-bg)] opacity-40' />
        <div className='relative z-10 -rotate-[25deg] select-none whitespace-nowrap text-5xl font-bold text-red-500'>
          SOLD OUT
        </div>
      </div>
    </div>
  );
};

export default SoldOutBanner;

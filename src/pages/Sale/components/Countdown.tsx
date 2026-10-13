interface CountdownProps {
  countdown: string;
}

const Countdown = ({ countdown }: CountdownProps) => {
  return (
    <div className='flex justify-center items-center flex-col gap-4 text-xl md:text-2xl lg:text-[3rem]'>
      <span>Sale starts in</span>
      <div className='text-4xl md:text-6xl lg:text-[8rem] font-bold'>
        {countdown}
      </div>
    </div>
  );
};

export default Countdown;

interface SaleDetailSectionProps {
  title: string;
  children: React.ReactNode;
}

const SaleDetailSection = ({ title, children }: SaleDetailSectionProps) => {
  return (
    <div className='flex flex-col gap-10'>
      <h2 className='text-center text-4xl font-bold'>{title}</h2>
      {children}
    </div>
  );
};

export default SaleDetailSection;

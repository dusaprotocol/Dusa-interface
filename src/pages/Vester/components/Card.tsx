interface CardProps {
  title: string;
  children: React.ReactNode;
}
const Card = ({ title, children }: CardProps) => {
  return (
    <div className='flex min-w-[250px] grow flex-col rounded-xl bg-[var(--hover-bg)]'>
      <h2 className='p-4 pb-0 text-xl'>{title}</h2>
      <div className='flex flex-col gap-2'>{children}</div>
    </div>
  );
};

export default Card;

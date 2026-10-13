import './index.scss';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const Skeleton = (props: SkeletonProps) => {
  return (
    <div className='Skeleton' {...props}>
      &nbsp;
    </div>
  );
};

export default Skeleton;

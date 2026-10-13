import React, { useEffect, memo } from 'react';
// import useMAS from 'hooks/useMAS';

const withPageTitle = (title: string, Component: React.ComponentType) => () => {
  const Memoized = memo(Component);
  // const currentPrice = useMAS();

  // useEffect(() => {
  //   document.title = `${title} ${
  //     currentPrice && `| $${currentPrice.toFixed(2)}`
  //   }`;
  // }, [currentPrice]);
  useEffect(() => {
    document.title = title;
  });
  return <Memoized />;
};

export default withPageTitle;

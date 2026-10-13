import { useEffect, useState } from 'react';
import debounce from 'lodash.debounce';

const getWindowSize = () => ({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight
});

const useResizeWindow = () => {
  const [windowSize, setWindowSize] = useState(getWindowSize());

  useEffect(() => {
    const debouncedHandleResize = debounce(() => {
      setWindowSize(getWindowSize());
    }, 200);

    window.addEventListener('resize', debouncedHandleResize);
    debouncedHandleResize();

    return () => {
      window.removeEventListener('resize', debouncedHandleResize);
      debouncedHandleResize.cancel();
    };
  }, []);

  return windowSize;
};

export default useResizeWindow;

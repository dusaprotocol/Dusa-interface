import { FallbackProps } from 'react-error-boundary';
import Button from 'components/Button';
import useClipboard from 'hooks/useClipboard';
import './index.scss';

type Optional<T> = {
  [P in keyof T]?: T[P];
};

const ErrorPage = (props: Optional<FallbackProps>) => {
  const { copy, copied } = useClipboard(props.error?.stack);
  return (
    <div className='ErrorPage'>
      {props?.error ? (
        <>
          <h1>{props.error.message}</h1>
          <div>
            <Button
              variant='outlined'
              text={copied ? 'Copied' : 'Copy error'}
              onClick={copy}
            />
            <Button
              variant='contained'
              text='Reload page'
              onClick={props.resetErrorBoundary}
            />
          </div>
        </>
      ) : (
        <h1>404 - This page could not be found.</h1>
      )}
    </div>
  );
};

export default ErrorPage;

import { useState } from 'react';

const useClipboard = (text: string) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return { copied, copy };
};

export default useClipboard;

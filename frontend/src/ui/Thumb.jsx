import { useEffect, useState } from 'react';

/** Renders an image Blob, managing its object URL so nothing leaks. */
export default function Thumb({ blob, alt = '', size = 56, className }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) return undefined;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img src={url} alt={alt} width={size} height={size} className={className} /> : null;
}

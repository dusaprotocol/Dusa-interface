interface TokenLogoProps {
  logoURI: string;
  size?: number;
}

const TokenLogo = ({ logoURI, size }: TokenLogoProps) => {
  return (
    <img
      src={logoURI}
      alt='logo'
      style={{
        width: size ?? 24,
        height: size ?? 24,
        maxHeight: size ?? 24,
        maxWidth: size ?? 24
      }}
      className='rounded-full'
    />
  );
};

export default TokenLogo;

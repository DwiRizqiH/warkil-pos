export default function BrandMark({ size = 'md' }) {
  const className = 'brand-mark' + (size === 'md' ? '' : ' ' + size);
  return (
    <span className={className}>
      <img src="/assets/icon/android-chrome-192x192.png" alt="" />
    </span>
  );
}

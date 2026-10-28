const paths = {
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  back: 'M20 12H5m6-6-6 6 6 6',
  sparkle: 'm12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z',
  slides: 'M4 3h16v14H4V3Zm8 14v4m-4 0h8M8 8h8M8 12h5',
  mic: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-4 6v1a7 7 0 0 0 14 0v-1m-7 8v3m-4 0h8',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  file: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h6',
  clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  shield: 'm12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5l8-3Zm-4 10 3 3 5-6',
  grid: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  flow: 'M4 3h6v6H4V3Zm10 12h6v6h-6v-6ZM7 9v9h7M10 6h7v9',
  alert: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v.01',
  download: 'M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  play: 'm8 4 12 8-12 8V4Z',
  edit: 'm15 3 6 6-12 12H3v-6L15 3Zm-3 3 6 6',
  info: 'M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  plus: 'M12 4v16M4 12h16',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3a8 8 0 0 1 16 0v3',
  logout: 'M9 3H3v18h6M8 12h13m-5-5 5 5-5 5',
}

export default function Icon({ name, size = 20, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.sparkle} />
    </svg>
  )
}

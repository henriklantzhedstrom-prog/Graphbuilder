import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

// Ikonerna är rent dekorativa (aria-hidden); knappen runt ger namnet. Därför ingen <title>,
// som annars visas som en egen liten textruta när man håller muspekaren över ikonen.
const base = (size: number, props: IconProps) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const IconUndo = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </svg>
);
export const IconRedo = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9a5 5 0 0 0 0 10h3" />
  </svg>
);
export const IconPlus = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconMinus = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M5 12h14" />
  </svg>
);
export const IconFit = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);
export const IconCursor = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M4 4l7.5 16 2.3-6.7L20.5 11z" />
  </svg>
);
export const IconHand = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L2.8 15.5a2 2 0 0 1 3-2.5L6 14" />
  </svg>
);
export const IconNode = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
export const IconNote = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M4 4h16v11l-5 5H4z" />
    <path d="M15 20v-5h5M8 9h8M8 13h5" />
  </svg>
);
export const IconImage = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="m21 16-5-5-8 8" />
  </svg>
);
export const IconEye = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconEyeOff = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 13.4 13.4M9.9 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-.9" />
  </svg>
);
export const IconLock = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
export const IconUnlock = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.5-2" />
  </svg>
);
export const IconTrash = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
  </svg>
);
export const IconChevronUp = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="m6 15 6-6 6 6" />
  </svg>
);
export const IconChevronDown = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IconClose = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconSwap = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
);
export const IconSelectAll = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 3" />
    <circle cx="10" cy="10" r="2" />
    <circle cx="15" cy="15" r="2" />
  </svg>
);
export const IconHelp = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01" />
  </svg>
);
export const IconFolder = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);
export const IconDownload = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M12 3v12M7 10l5 5 5-5M4 19h16" />
  </svg>
);
export const IconCopy = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
);
export const IconGrip = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="3" />
  </svg>
);
export const IconSun = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const IconMoon = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);
export const IconFilePlus = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M12 12v6M9 15h6" />
  </svg>
);
export const IconFolderOpen = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M3 18V7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v1" />
    <path d="M3 18l2.4-6.6A2 2 0 0 1 7.3 10H20a1.5 1.5 0 0 1 1.4 2l-2 6a2 2 0 0 1-1.9 1.4H4.5A1.5 1.5 0 0 1 3 18z" />
  </svg>
);
export const IconSave = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M7 3v5h8V3M7 21v-7h10v7" />
  </svg>
);
export const IconImport = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M12 3v11M8 10l4 4 4-4" />
    <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </svg>
);
export const IconExport = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </svg>
);
export const IconLayers = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);
export const IconPalette = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3a2 2 0 0 1 2-2h2.2A3.8 3.8 0 0 0 21 10.6C21 6.400 17 3 12 3z" />
    <path d="M7.500 12h.01M9.500 8h.01M14.500 7.500h.01" strokeWidth="2.6" />
  </svg>
);
export const IconLogo = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, { strokeWidth: 2.2, ...p })}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="9" r="3" />
    <circle cx="9" cy="18.5" r="3" />
    <path d="m8.9 6.8 6.2 1.4M7.6 15.6l-1-6.6M16.3 11.5l-5.4 4.6" />
  </svg>
);
export const IconList = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M9 7h11M9 12h11M9 17h11M4.500 7h.01M4.500 12h.01M4.500 17h.01" />
  </svg>
);
export const IconLink = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.700-5.700l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1" />
  </svg>
);

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

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
    <title>Ångra</title>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </svg>
);
export const IconRedo = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Gör om</title>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9a5 5 0 0 0 0 10h3" />
  </svg>
);
export const IconPlus = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Lägg till</title>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconMinus = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Minus</title>
    <path d="M5 12h14" />
  </svg>
);
export const IconFit = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Anpassa</title>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);
export const IconCursor = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Markera</title>
    <path d="M4 4l7.5 16 2.3-6.7L20.5 11z" />
  </svg>
);
export const IconHand = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Panorera</title>
    <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L2.8 15.5a2 2 0 0 1 3-2.5L6 14" />
  </svg>
);
export const IconNode = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Nod</title>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
export const IconNote = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Anteckning</title>
    <path d="M4 4h16v11l-5 5H4z" />
    <path d="M15 20v-5h5M8 9h8M8 13h5" />
  </svg>
);
export const IconImage = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Bild</title>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="m21 16-5-5-8 8" />
  </svg>
);
export const IconEye = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Synlig</title>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconEyeOff = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Dold</title>
    <path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 13.4 13.4M9.9 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-.9" />
  </svg>
);
export const IconLock = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Låst</title>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
export const IconUnlock = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Olåst</title>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.5-2" />
  </svg>
);
export const IconTrash = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Ta bort</title>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
  </svg>
);
export const IconChevronUp = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Upp</title>
    <path d="m6 15 6-6 6 6" />
  </svg>
);
export const IconChevronDown = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Ned</title>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IconClose = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Stäng</title>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconSwap = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Vänd</title>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
);
export const IconSelectAll = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Markera allt</title>
    <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 3" />
    <circle cx="10" cy="10" r="2" />
    <circle cx="15" cy="15" r="2" />
  </svg>
);
export const IconHelp = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Hjälp</title>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01" />
  </svg>
);
export const IconFolder = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Modeller</title>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);
export const IconDownload = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Exportera</title>
    <path d="M12 3v12M7 10l5 5 5-5M4 19h16" />
  </svg>
);
export const IconCopy = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Duplicera</title>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
);
export const IconGrip = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <title>Dra</title>
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="3" />
  </svg>
);

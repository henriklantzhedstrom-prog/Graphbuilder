import { nodeCaption } from "@/model/caption";
import type { GraphNode, NodeStyle, Point } from "@/model/types";
import { PropertyBackground } from "./PropertyBackground";
import { estimateTextWidth, LINE_HEIGHT, propertyLines, wrapToWidth } from "./text";

export const HALO_WIDTH = 14;

export interface NodeViewProps {
  node: GraphNode;
  style: NodeStyle;
  position: Point;
  /** Ritas med data-attribut och halo för interaktion. Av vid export. */
  interactive?: boolean;
  /** Döljer rubriken medan den redigeras på plats. */
  hideCaption?: boolean;
  selected?: boolean;
  /** Noden har samma labels som en annan nod (röd ring). */
  conflict?: boolean;
  /** Markeras som mål när en relation dras över noden. */
  highlighted?: boolean;
  zoom?: number;
}

export function NodeView({
  node,
  style,
  position,
  interactive = false,
  hideCaption = false,
  selected = false,
  highlighted = false,
  conflict = false,
  zoom = 1,
}: NodeViewProps) {
  const { x, y } = position;
  const r = style.radius;
  const captionLines = hideCaption
    ? []
    : wrapToWidth(nodeCaption(node), r * 2 * 0.82, style.captionFontSize);
  const captionLineHeight = style.captionFontSize * LINE_HEIGHT;
  const captionStartY = y - ((captionLines.length - 1) * captionLineHeight) / 2;

  const labelHeight = style.labelFontSize * 1.5;
  const labelWidths = node.labels.map((l) => estimateTextWidth(l, style.labelFontSize) + 14);
  const labelsTotal =
    labelWidths.reduce((a, b) => a + b, 0) + Math.max(0, node.labels.length - 1) * 4;
  let labelX = x - labelsTotal / 2;
  const labelY = y - r - labelHeight - 6;

  // Alla egenskaper listas under noden, även den som också visas som rubrik.
  const props = propertyLines(node.properties);
  const propLineHeight = style.propertyFontSize * LINE_HEIGHT;
  const propStartY = y + r + 8 + style.propertyFontSize;

  return (
    <g
      className="gb-node"
      data-ref={interactive ? `node:${node.id}` : undefined}
      data-part={interactive ? "body" : undefined}
    >
      {conflict && (
        <circle
          data-testid="label-conflict-ring"
          cx={x}
          cy={y}
          r={r + style.strokeWidth / 2 + 9 / zoom}
          fill="none"
          stroke="var(--color-danger)"
          strokeWidth={2.5 / zoom}
          strokeDasharray={`${4 / zoom} ${3 / zoom}`}
          style={{ pointerEvents: "none" }}
        />
      )}
      {(selected || highlighted) && (
        <circle
          cx={x}
          cy={y}
          r={r + style.strokeWidth / 2 + 4 / zoom}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={(highlighted ? 4 : 2) / zoom}
          strokeDasharray={highlighted ? undefined : `${6 / zoom} ${4 / zoom}`}
          style={{ pointerEvents: "none" }}
        />
      )}
      {interactive && (
        <circle
          className="gb-halo"
          cx={x}
          cy={y}
          r={r + HALO_WIDTH / 2 + style.strokeWidth / 2}
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity={0}
          strokeWidth={HALO_WIDTH}
          data-ref={`node:${node.id}`}
          data-part="halo"
        />
      )}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
      {captionLines.length > 0 && (
        <text
          x={x}
          y={captionStartY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={style.captionFontSize}
          fill={style.captionColor}
          fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {captionLines.map((line, i) => (
            <tspan key={i} x={x} dy={i === 0 ? 0 : captionLineHeight}>
              {line || " "}
            </tspan>
          ))}
        </text>
      )}
      {node.labels.map((label, i) => {
        const w = labelWidths[i] ?? 0;
        const lx = labelX;
        labelX += w + 4;
        return (
          <g key={`${label}-${i}`} style={{ pointerEvents: "none" }}>
            <rect
              x={lx}
              y={labelY}
              width={w}
              height={labelHeight}
              rx={labelHeight / 2}
              fill={style.labelBackground}
              stroke={style.labelBorderColor}
              strokeWidth={style.labelBorderWidth}
            />
            <text
              x={lx + w / 2}
              y={labelY + labelHeight / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={style.labelFontSize}
              fill={style.labelColor}
              fontFamily="system-ui, sans-serif"
              style={{ userSelect: "none" }}
            >
              {label}
            </text>
          </g>
        );
      })}
      <PropertyBackground
        lines={props}
        centerX={x}
        firstBaseline={propStartY}
        fontSize={style.propertyFontSize}
        lineHeight={propLineHeight}
        fill={style.propertyBackground}
      />
      {props.length > 0 && (
        <text
          x={x}
          y={propStartY}
          textAnchor="middle"
          fontSize={style.propertyFontSize}
          fill={style.propertyColor}
          fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {props.map((line, i) => (
            <tspan key={i} x={x} dy={i === 0 ? 0 : propLineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

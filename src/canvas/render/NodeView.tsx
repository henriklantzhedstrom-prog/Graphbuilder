import { nodeCaption } from "@/model/caption";
import type { GraphNode, NodeStyle, Point } from "@/model/types";
import { nodeOuterRadius } from "@/store/selectors";
import { labelLayout } from "./labels";
import { PropertyBackground, propertyTextX } from "./PropertyBackground";
import { LINE_HEIGHT, propertyLines, wrapToWidth } from "./text";

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
  /** Falskt när lagret "Properties" är dolt: egenskapsraderna under noden ritas inte. */
  showProperties?: boolean;
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
  showProperties = true,
}: NodeViewProps) {
  const { x, y } = position;
  const r = style.radius;
  const captionLines = hideCaption
    ? []
    : wrapToWidth(nodeCaption(node), r * 2 * 0.82, style.captionFontSize);
  const captionLineHeight = style.captionFontSize * LINE_HEIGHT;
  const captionStartY = y - ((captionLines.length - 1) * captionLineHeight) / 2;

  // `r` är den fyllda ytans radie. Kanten ligger utanför den och växer utåt; allt runt noden
  // (labels, egenskaper, markeringsringar) räknas från kantens ytterkant.
  const outerR = nodeOuterRadius(style);
  const labels = labelLayout(node.labels, style, x, y - outerR).boxes;
  const labelBorder = style.labelBorderWidth;

  // Alla egenskaper listas under noden, även den som också visas som rubrik.
  const props = showProperties ? propertyLines(node.properties) : [];
  const propLineHeight = style.propertyFontSize * LINE_HEIGHT;
  const propStartY = y + outerR + 6 + style.propertyFontSize;
  const propX = propertyTextX(props, x, style.propertyFontSize);

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
          r={outerR + 9 / zoom}
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
          r={outerR + 4 / zoom}
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
          r={outerR + HALO_WIDTH / 2}
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
        data-part="node-circle"
        data-radius={r}
        // Linjens mitt ligger en halv kantbredd utanför den fyllda ytan.
        r={r + style.strokeWidth / 2}
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
      {labels.map(({ label, inner }, i) => (
        <g key={`${label}-${i}`} style={{ pointerEvents: "none" }}>
          {/* Kanten ligger utanför labelns inre yta: linjens mitt är en halv kantbredd utanför. */}
          <rect
            data-part="label-box"
            x={inner.x - labelBorder / 2}
            y={inner.y - labelBorder / 2}
            width={inner.w + labelBorder}
            height={inner.h + labelBorder}
            rx={(inner.h + labelBorder) / 2}
            fill={style.labelBackground}
            stroke={style.labelBorderColor}
            strokeWidth={labelBorder}
          />
          <text
            x={inner.x + inner.w / 2}
            y={inner.y + inner.h / 2}
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
      ))}
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
          data-part="property-text"
          x={propX}
          y={propStartY}
          textAnchor="start"
          fontSize={style.propertyFontSize}
          fill={style.propertyColor}
          fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {props.map((line, i) => (
            <tspan key={i} x={propX} dy={i === 0 ? 0 : propLineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

import type { RelationshipGeometry } from "@/model/geometry";
import type { Relationship, RelationshipStyle } from "@/model/types";
import { PropertyBackground } from "./PropertyBackground";
import { LINE_HEIGHT, measureTextWidth, propertyLines, TYPE_PADDING_X } from "./text";

export interface RelationshipViewProps {
  relationship: Relationship;
  style: RelationshipStyle;
  geometry: RelationshipGeometry;
  interactive?: boolean;
  hideType?: boolean;
  selected?: boolean;
  zoom?: number;
}

export function RelationshipView({
  relationship,
  style,
  geometry,
  interactive = false,
  hideType = false,
  selected = false,
  zoom = 1,
}: RelationshipViewProps) {
  const { labelPosition, labelAngle } = geometry;
  const type = hideType ? "" : relationship.type;
  const typeWidth = measureTextWidth(type, style.typeFontSize) + TYPE_PADDING_X * 2;
  const typeHeight = style.typeFontSize * 1.4;
  const props = propertyLines(relationship.properties);
  const propLineHeight = style.propertyFontSize * LINE_HEIGHT;

  return (
    <g
      className="gb-relationship"
      data-ref={interactive ? `relationship:${relationship.id}` : undefined}
      data-part={interactive ? "body" : undefined}
    >
      {interactive && (
        <path
          d={geometry.path}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(24, style.width + 12)}
          style={{ cursor: "pointer" }}
        />
      )}
      {selected && (
        <path
          d={geometry.path}
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity={0.45}
          strokeWidth={style.width + 10 / zoom}
          strokeLinecap="round"
          style={{ pointerEvents: "none" }}
        />
      )}
      <path
        d={geometry.path}
        fill="none"
        stroke={style.color}
        strokeWidth={style.width}
        strokeDasharray={style.dashed ? `${style.width * 3} ${style.width * 2}` : undefined}
        strokeLinecap="round"
        style={{ pointerEvents: "none" }}
      />
      {geometry.arrow && (
        <polygon points={geometry.arrow} fill={style.color} style={{ pointerEvents: "none" }} />
      )}
      <g transform={`translate(${labelPosition.x} ${labelPosition.y}) rotate(${labelAngle})`}>
        {type && (
          <>
            <rect
              x={-typeWidth / 2}
              y={-typeHeight / 2}
              width={typeWidth}
              height={typeHeight}
              rx={3}
              fill={style.typeBackground}
              style={{ cursor: interactive ? "pointer" : undefined }}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={style.typeFontSize}
              fill={style.typeColor}
              fontFamily="system-ui, sans-serif"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {type}
            </text>
          </>
        )}
        <PropertyBackground
          lines={props}
          centerX={0}
          firstBaseline={(type ? typeHeight / 2 : 0) + style.propertyFontSize + 2}
          fontSize={style.propertyFontSize}
          lineHeight={propLineHeight}
          fill={style.propertyBackground}
        />
        {props.length > 0 && (
          <text
            x={0}
            y={(type ? typeHeight / 2 : 0) + style.propertyFontSize + 2}
            textAnchor="middle"
            fontSize={style.propertyFontSize}
            fill={style.propertyColor}
            fontFamily="system-ui, sans-serif"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {props.map((line, i) => (
              <tspan key={i} x={0} dy={i === 0 ? 0 : propLineHeight}>
                {line}
              </tspan>
            ))}
          </text>
        )}
      </g>
    </g>
  );
}

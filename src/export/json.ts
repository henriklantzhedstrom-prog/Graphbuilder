import type { GraphDocument } from "@/model/types";
import { serializeDocument } from "@/store/persistence";
import { selectDocument } from "./filter";

export function exportJson(doc: GraphDocument, options: { onlyVisible: boolean }): string {
  return serializeDocument(selectDocument(doc, options.onlyVisible));
}

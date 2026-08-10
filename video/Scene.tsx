import React from "react";
import { Theme } from "./theme";
import * as S from "./primitives/shared";
import * as G from "./primitives/geography";
import * as P from "./primitives/psir";

/** primitive id → component. An unknown id renders the Fallback rather than
    crashing the render: one bad board must not destroy a batch. */
const MAP: Record<string, React.FC<S.PrimProps>> = {
  TITLE: S.Title,
  CAUSAL_CHAIN: S.CausalChain,
  COMPARISON_SPLIT: S.ComparisonSplit,
  TIMELINE: S.Timeline,
  DEFINITION_REVEAL: S.DefinitionReveal,
  QUOTE_REVEAL: S.QuoteReveal,
  MEMORY_ANCHOR: S.MemoryAnchor,
  RECALL_FRAME: S.RecallFrame,
  UPSC_PANEL: S.UpscPanel,

  CROSS_SECTION: G.CrossSection,
  PLATE_BOUNDARY: G.PlateBoundary,
  EARTH_GLOBE: G.EarthGlobe,
  PHYSICAL_MAP: G.PhysicalMap,
  ATMOSPHERIC_CELL: G.AtmosphericCell,
  OCEAN_CURRENT: G.OceanCurrent,
  PRESSURE_SYSTEM: G.PressureSystem,
  WIND_VECTOR: G.WindVector,
  PROFILE_DIAGRAM: G.ProfileDiagram,

  CONCEPT_GRAPH: P.ConceptGraph,
  THINKER_WORLD: P.ThinkerWorld,
  INSTITUTION_DIAGRAM: P.InstitutionDiagram,
  STATE_TRANSITION: P.StateTransition,
  GEOPOLITICAL_MAP: P.GeopoliticalMap,
};

export const SceneBody: React.FC<{ primitive: string; props: Record<string, any>; theme: Theme }> = ({ primitive, props, theme }) => {
  const C = MAP[primitive];
  if (!C) return <S.Fallback name={primitive} props={props} theme={theme} />;
  return <C props={props ?? {}} theme={theme} />;
};

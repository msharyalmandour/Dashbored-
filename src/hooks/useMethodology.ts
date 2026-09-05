import { useCallback, useEffect, useState } from "react";
import { methodology as mockMethodology } from "../data/mockData";
import type { Methodology } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

function mapRow(row: {
  study_design: string;
  study_design_status: Methodology["studyDesignStatus"];
  study_setting: string;
  population: string;
  sampling_inclusion: string[];
  sampling_exclusion: string[];
  sample_size: string;
  sampling_technique: string;
  data_collection_methods: string[];
  study_tool_type: Methodology["studyTool"]["type"];
  study_tool_name: string;
}): Methodology {
  return {
    studyDesign: row.study_design,
    studyDesignStatus: row.study_design_status,
    studySetting: row.study_setting,
    population: row.population,
    sampling: {
      inclusionCriteria: row.sampling_inclusion ?? [],
      exclusionCriteria: row.sampling_exclusion ?? [],
      sampleSize: row.sample_size,
      samplingTechnique: row.sampling_technique,
    },
    dataCollectionMethods: row.data_collection_methods ?? [],
    studyTool: { type: row.study_tool_type, name: row.study_tool_name },
  };
}

/** بيانات المنهجية الحقيقية — صف واحد لكل مشروع بحث، يُنشأ فارغًا تلقائيًا
    ويُملأ بالتدريج من الواجهة. وضع العرض التجريبي يرجع mockData.ts فقط للعرض. */
export function useMethodology() {
  const [methodology, setMethodology] = useState<Methodology>(mockMethodology);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase!.from("methodology").select("*").single();
    if (data) setMethodology(mapRow(data));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateMethodology = async (updates: Partial<Methodology>) => {
    if (!isSupabaseConfigured) {
      setMethodology((prev) => ({ ...prev, ...updates }));
      return { error: undefined as string | undefined };
    }

    setMethodology((prev) => ({ ...prev, ...updates }));

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.studyDesign !== undefined) dbUpdates.study_design = updates.studyDesign;
    if (updates.studyDesignStatus !== undefined) dbUpdates.study_design_status = updates.studyDesignStatus;
    if (updates.studySetting !== undefined) dbUpdates.study_setting = updates.studySetting;
    if (updates.population !== undefined) dbUpdates.population = updates.population;
    if (updates.sampling?.inclusionCriteria !== undefined) dbUpdates.sampling_inclusion = updates.sampling.inclusionCriteria;
    if (updates.sampling?.exclusionCriteria !== undefined) dbUpdates.sampling_exclusion = updates.sampling.exclusionCriteria;
    if (updates.sampling?.sampleSize !== undefined) dbUpdates.sample_size = updates.sampling.sampleSize;
    if (updates.sampling?.samplingTechnique !== undefined) dbUpdates.sampling_technique = updates.sampling.samplingTechnique;
    if (updates.dataCollectionMethods !== undefined) dbUpdates.data_collection_methods = updates.dataCollectionMethods;
    if (updates.studyTool?.type !== undefined) dbUpdates.study_tool_type = updates.studyTool.type;
    if (updates.studyTool?.name !== undefined) dbUpdates.study_tool_name = updates.studyTool.name;

    const { data: projectId } = await supabase!.rpc("my_research_project_id");
    const { error } = await supabase!.from("methodology").update(dbUpdates).eq("research_project_id", projectId);
    if (error) load();
    return { error: error?.message };
  };

  return { methodology, loading, updateMethodology };
}

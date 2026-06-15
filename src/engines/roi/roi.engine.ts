import type { RoiEngine as RoiEngineContract } from "@/interfaces";
import type { Recommendation, RoiEstimate } from "@/types";
import { EngineNotImplementedError } from "@/lib/errors";

export class RoiEngine implements RoiEngineContract {
  async estimateRoi(_recommendations: Recommendation[]): Promise<RoiEstimate[]> {
    void _recommendations;

    throw new EngineNotImplementedError("RoiEngine", "estimateRoi");
  }
}

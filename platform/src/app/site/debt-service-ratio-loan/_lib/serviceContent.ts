import type { ServiceContent } from "./serviceContentTypes";
import { batch1 } from "./serviceContent-batch1";
import { batch2 } from "./serviceContent-batch2";
import { batch3 } from "./serviceContent-batch3";

const allContent: Record<string, ServiceContent> = {
  ...batch1,
  ...batch2,
  ...batch3,
};

export function getServiceContent(slug: string): ServiceContent | null {
  return allContent[slug] ?? null;
}

import type { ServiceContent } from "./serviceContentTypes";
import { batch1 } from "./serviceContent-batch1";
import { batch2 } from "./serviceContent-batch2";
import { batch3 } from "./serviceContent-batch3";
import { batch4 } from "./serviceContent-batch4";
import { batch5 } from "./serviceContent-batch5";

const allContent: Record<string, ServiceContent> = {
  ...batch1,
  ...batch2,
  ...batch3,
  ...batch4,
  ...batch5,
};

export function getServiceContent(slug: string): ServiceContent | null {
  return allContent[slug] ?? null;
}

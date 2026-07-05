export interface ServiceSection {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ComparisonRow {
  feature: string;
  values: string[];
}

export interface ServiceContent {
  tableOfContents: { id: string; title: string }[];
  sections: ServiceSection[];
  faqs: ServiceFaq[];
  comparisonTable?: {
    headers: string[];
    rows: ComparisonRow[];
  };
  keyTakeaways: string[];
  relatedSlugs: string[];
}

export type AuditStatus = 'pass' | 'warning' | 'fail';
export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type SearchIntent = 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
export type KeywordGroup = 'Primary' | 'Secondary' | 'Long-tail' | 'Question-based';
export type AuditGoal = 'leads' | 'sales' | 'traffic' | 'brand_awareness';

export interface AuditInputContext {
  url: string;
  targetCountry?: string;
  industry?: string;
  competitorUrl?: string;
  goal?: AuditGoal | '';
}

export interface CategoryScores {
  seo: number;
  content: number;
  keywords: number;
  technical: number;
  aiSearch: number;
}

export interface SeoAuditItem {
  id: string;
  check: string;
  category: string;
  status: AuditStatus;
  priority: PriorityLevel;
  finding: string;
  fix: string;
}

export interface ContentTopicIdea {
  id: string;
  title: string;
  searchIntent: SearchIntent;
  priority: PriorityLevel;
  targetAngle: string;
}

export interface ContentRecommendations {
  contentGaps: string[];
  topicIdeas: ContentTopicIdea[];
  qualityNotes: {
    readability: string;
    depth: string;
    freshness: string;
    ctas: string;
  };
}

export interface KeywordSuggestion {
  id: string;
  keyword: string;
  group: KeywordGroup;
  searchIntent: SearchIntent;
  difficulty: PriorityLevel;
  opportunity: PriorityLevel;
  estimatedMonthlySearches: string;
  rationale: string;
}

export interface TechnicalChecklistItem {
  id: string;
  item: string;
  area: string;
  status: AuditStatus;
  priority: PriorityLevel;
  howToFix: string;
  completed?: boolean;
}

export interface AiSearchRecommendation {
  id: string;
  area: string;
  status: AuditStatus;
  priority: PriorityLevel;
  finding: string;
  recommendation: string;
}

export interface AiSearchOptimization {
  aiVisibilityScore: number;
  scoreReasons: string[];
  recommendations: AiSearchRecommendation[];
}

export interface QuickWin {
  id: string;
  title: string;
  impact: 'High' | 'Medium';
  effort: string;
  category: string;
  steps: string;
}

export interface ActionPlan {
  days30: string[];
  days60: string[];
  days90: string[];
}

export interface CompetitorComparison {
  competitorUrl: string;
  summary: string;
  strengthsOverCompetitor: string[];
  gapsToClose: string[];
  metrics: {
    category: string;
    siteScore: number;
    competitorEstimate: number;
  }[];
}

export interface SiteSnapshot {
  title?: string;
  metaDescription?: string;
  statusCode?: number;
  loadTimeMs?: number;
  hasHttps: boolean;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  schemaCount: number;
  h1Count: number;
  imagesWithoutAlt: number;
  crawlNote?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AuditReport {
  id: string;
  url: string;
  auditedAt: string;
  isDemo?: boolean;
  context: Omit<AuditInputContext, 'url'>;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  verdict: string;
  categoryScores: CategoryScores;
  siteSnapshot?: SiteSnapshot;
  groundingSources?: GroundingSource[];
  seoAudit: SeoAuditItem[];
  contentRecommendations: ContentRecommendations;
  keywordSuggestions: KeywordSuggestion[];
  technicalSeoChecklist: TechnicalChecklistItem[];
  aiSearchOptimization: AiSearchOptimization;
  quickWins: QuickWin[];
  actionPlan: ActionPlan;
  competitorComparison?: CompetitorComparison;
}

export interface AuditHistoryEntry {
  id: string;
  url: string;
  auditedAt: string;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  isDemo?: boolean;
  report: AuditReport;
}

export type DashboardTab =
  | 'overview'
  | 'seo'
  | 'content'
  | 'keywords'
  | 'technical'
  | 'ai-search'
  | 'action-plan';

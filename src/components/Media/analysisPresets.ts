export interface AnalysisPresetConfig {
  nameKey: string
  nameDefault: string
  systemPrompt: string
  userPrefix?: string
}

export const ANALYSIS_PRESETS: AnalysisPresetConfig[] = [
  {
    nameKey: 'mediaPage.presetComprehensiveAnalysis',
    nameDefault: 'Comprehensive Analysis',
    systemPrompt:
      'You are an expert analyst. Provide a comprehensive analysis of the following content, including key themes, insights, and actionable takeaways.'
  },
  {
    nameKey: 'mediaPage.presetExecutiveSummary',
    nameDefault: 'Executive Summary',
    systemPrompt:
      'Provide an executive summary with key points, main conclusions, and recommendations. Keep it concise and actionable.'
  },
  {
    nameKey: 'mediaPage.presetCriticalReview',
    nameDefault: 'Critical Review',
    systemPrompt:
      'Act as a critical reviewer. Identify strengths, weaknesses, gaps in logic, and areas for improvement. Provide specific, actionable feedback.'
  },
  {
    nameKey: 'mediaPage.presetQAAnalysis',
    nameDefault: 'Q&A Analysis',
    systemPrompt:
      'Analyze the content and create a Q&A format response covering: What is it about? Who is it for? What are the key takeaways? What actions should be taken?'
  }
]

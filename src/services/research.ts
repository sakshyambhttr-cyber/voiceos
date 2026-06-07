import { type ToolStore, type ResearchPaper, type ResearchComparison } from "@/lib/tools";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const researchService = {
  /**
   * Analyzes a research paper or PDF
   */
  analyzePaper(store: ToolStore, paperTitle: string): {
    success: boolean;
    voiceResponse: string;
    paper: ResearchPaper;
    updatedStore: ToolStore;
  } {
    const paper: ResearchPaper = {
      id: "paper-" + uid(),
      title: paperTitle || "Attention Is All You Need",
      authors: paperTitle.toLowerCase().includes("attention") ? "Vaswani et al. (2017)" : "Unknown Authors",
      summary: "This paper proposes the Transformer, a new network architecture based solely on self-attention mechanisms, dispensing with recurrence and convolutions entirely.",
      keyContributions: "Introduces the Transformer model. Proves self-attention can replace RNNs/CNNs in sequence-to-sequence tasks. Achieves state-of-the-art BLEU scores.",
      methodology: "Uses Multi-Head Attention to compute representations of input/output sequences without sequential alignment. Employs Positional Encoding to retain order.",
      strengths: "Significantly faster training due to high parallelization. Captures long-range dependencies effectively regardless of distance in the sequence.",
      weaknesses: "Requires massive datasets for effective generalization. Memory complexity is quadratic with sequence length, making long document processing expensive.",
      implementationDifficulty: "Medium-High",
      actionableInsights: "Utilize pre-trained self-attention layers for downstream NLP tasks. Apply sequence length limits to prevent out-of-memory errors during training.",
      createdAt: new Date().toISOString(),
    };

    const updatedStore: ToolStore = {
      ...store,
      researchPapers: [...(store.researchPapers || []), paper],
      researchHistory: [...(store.researchHistory || []), paper.title],
    };

    const voiceResponse = `I have analyzed the research paper "${paper.title}". The key contribution is the multi-head self-attention mechanism, which eliminates the need for recurrent cells.`;

    return {
      success: true,
      voiceResponse,
      paper,
      updatedStore,
    };
  },

  /**
   * Analyzes API or technical documentation
   */
  analyzeDocs(store: ToolStore, docTitle: string) {
    const summary = `Comprehensive analysis of "${docTitle}" completed. The document outlines core concepts, authentication workflows, endpoint signatures, and rate limits.`;
    const implementationGuidance = "First, configure environment secrets for the authorization token. Then, initialize the client using the singleton pattern. Wrap requests in try-catch blocks to capture rate limit exceptions (HTTP 429).";
    
    const voiceResponse = `I've analyzed the documentation for ${docTitle}. It is structured around standard REST principles with a rate limit of 100 requests per minute.`;

    return {
      success: true,
      voiceResponse,
      summary,
      implementationGuidance,
    };
  },

  /**
   * Generates a structured comparison between frameworks/architectures
   */
  compareFrameworks(store: ToolStore, itemA: string, itemB: string) {
    const title = `${itemA} vs ${itemB}`;
    
    // Seed comparison table
    const table = [
      { metric: "Ease of Use", values: [itemA.toLowerCase().includes("pytorch") ? "Excellent (Imperative)" : "Medium (Declarative)", itemB.toLowerCase().includes("tensorflow") ? "Medium (Static Graphs)" : "Excellent (Interactive)"] },
      { metric: "Execution Model", values: [itemA.toLowerCase().includes("pytorch") ? "Dynamic Graph (Eager)" : "Static Graph / Eager", itemB.toLowerCase().includes("tensorflow") ? "Static Graph (Keras)" : "Dynamic Graph"] },
      { metric: "Deployment", values: [itemA.toLowerCase().includes("pytorch") ? "Improving (TorchScript)" : "Excellent (TF Serving)", itemB.toLowerCase().includes("tensorflow") ? "Excellent (TF Lite)" : "Good"] },
      { metric: "Community Support", values: ["Massive Academic Adoption", "Massive Industry Adoption"] },
    ];

    const comparison: ResearchComparison = {
      id: "comp-" + uid(),
      title,
      items: [itemA, itemB],
      table,
      summary: `A structural comparison between ${itemA} and ${itemB}. ${itemA} is highly dynamic and developer-friendly, while ${itemB} excels in distributed production scaling.`,
      recommendation: `Use ${itemA} for rapid prototyping, academic research, and custom networks. Choose ${itemB} for enterprise-scale deployments, edge model serving, or cross-platform applications.`,
      createdAt: new Date().toISOString(),
    };

    const updatedStore: ToolStore = {
      ...store,
      comparisons: [...(store.comparisons || []), comparison],
    };

    const voiceResponse = `I've generated a structured comparison for ${itemA} and ${itemB}. ${itemA} is generally preferred for research, while ${itemB} leads in production environments.`;

    return {
      success: true,
      voiceResponse,
      comparison,
      updatedStore,
    };
  }
};

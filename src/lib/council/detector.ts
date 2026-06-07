/* ─────────────────────────────────────────────────────────────
   Council Complexity Detector
   Decides whether to route through the multi-agent council
   or use the normal single-LLM pipeline.
   Zero latency — pure pattern matching.
───────────────────────────────────────────────────────────── */

/** Returns true when the request warrants multi-agent reasoning */
export function requiresCouncil(message: string): boolean {
  const m = message.toLowerCase().trim();

  // Short messages are never complex enough for the council
  if (m.split(" ").length < 5) {
    return false;
  }

  const complexPatterns = [
    // Planning & projects
    /prepare (for|my).{3,}/,
    /plan (my|a|the|for).{3,}/,
    /help me (plan|prepare|build|launch|create|develop|design|start)/,
    /roadmap (for|to)/,
    /strategy (for|to)/,
    // Learning paths
    /learn.{3,}in \d+\s*(day|week|month)/,
    /study (plan|roadmap|schedule)/,
    /prepare for.{3,}(exam|test|interview|hackathon|competition)/,
    // Startup / business
    /launch (a|my|the) startup/,
    /start (a|my|the) (business|company|startup|project)/,
    /business (plan|strategy|model)/,
    /go to market/,
    // Career
    /career (plan|change|transition|path|roadmap)/,
    /get (a job|hired|promoted)/,
    /switch (career|job|field)/,
    // Complex multi-part questions
    /how (should|do) i.{20,}/,
    /what (should|is the best way to).{20,}/,
    /give me a (full|complete|detailed|comprehensive) plan/,
    // Hackathon specific (demo showcase)
    /hackathon/,
    /national competition/,
    /pitch (deck|presentation)/,
  ];

  return complexPatterns.some((pattern) => pattern.test(m));
}

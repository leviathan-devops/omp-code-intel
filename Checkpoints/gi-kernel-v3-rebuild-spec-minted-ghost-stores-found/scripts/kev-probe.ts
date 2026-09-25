// ★ KEV — THE LOCAL DECISION MODEL (onnx-community/kev-0.6b-ONNX via transformers.js).
//
// WHAT KEV IS: a decision model, not a generator. ONE document (the STATE) + N typed
// questions are packed into a single sequence with five delimiter tokens; a block-causal
// mask lets every question see the state and itself only; a pointer head scores each
// option's `</opt>` token against its question's `<decide>` token. The output is one
// probability per option — a Choice distribution, a noul p(yes), or a Score level.
//
// ★ WHY IT BELONGS HERE: the GI kernel's meaning gate (TSG) calls TypeSafe's REMOTE
// /v1/systemone. KEV is the SAME CONTRACT, locally — the 0.6B member of the Kev family.
// This probe proves the model loads and decides BEFORE it is wired into the kernel.
//
// Usage: bun scripts/kev-probe.ts
import { AutoTokenizer, PreTrainedModel, Tensor } from "@huggingface/transformers";

const REPO = "onnx-community/kev-0.6b-ONNX";

/** The tokenizer surface this probe uses — NAMED, not `ReturnType<typeof …>`. */
export interface KevTokenizer {
  (text: string, opts: { add_special_tokens: boolean }): { input_ids: { data: ArrayLike<bigint | number> } };
}

/** ★ THE CALLER-TEXT SANITIZER — for USER TEXT ONLY: `<|name|>` → `<¦name¦>` so caller text
 *  can never forge a delimiter (kev.model.user_tokens).
 *  ★ THE MEASURED DEFECT IN THE REFERENCE EXAMPLE (2026-09-23): the model card applies THIS
 *  transform to the DELIMITERS TOO, which turns `<|fim_prefix|>` (id 151659) into
 *  `<¦fim_prefix¦>` (id 27). The graph then finds NO delimiter ids, derives NO segments, and
 *  the pointer head emits ALL ZEROS — a uniform distribution that looks like a confident
 *  "no signal". MEASURED: with the sanitized delimiters the logits are `0.00 × 38`; with the
 *  RAW delimiters they are `… 5.33 6.41` and the answer is `p(yes)=0.7469`. */
const encUser = (tokenizer: KevTokenizer, t: string): number[] =>
  Array.from(
    tokenizer(t.replace(/<\|([A-Za-z0-9_]+)\|>/g, "<¦$1¦>"), { add_special_tokens: false }).input_ids.data,
    Number,
  );

/** ★ THE DELIMITERS — the RAW special tokens, NEVER sanitized. */
const encRaw = (tokenizer: KevTokenizer, t: string): number[] =>
  Array.from(tokenizer(t, { add_special_tokens: false }).input_ids.data, Number);

export interface KevQuestion {
  instr: string;
  options: string[];
}

export interface KevResult {
  /** one distribution per question, in the questions' order */
  answers: number[][];
  /** the token ids of the packed sequence (for the audit trail) */
  tokenCount: number;
}

/** ★ THE DECISION. Pack the state + the questions, run ONE forward pass, softmax per question. */
export async function kevDecide(state: string, questions: KevQuestion[]): Promise<KevResult> {
  const tokenizer = await AutoTokenizer.from_pretrained(REPO);
  const model = await PreTrainedModel.from_pretrained(REPO, { dtype: "q4", device: "cpu" });

  const [STATE, Q, OPT, END, DECIDE] = ["<|fim_prefix|>", "<|fim_middle|>", "<|box_start|>", "<|box_end|>", "<|fim_suffix|>"].map(
    (t) => encRaw(tokenizer, t)[0],
  );

  const tokens: number[] = [STATE!, ...encUser(tokenizer, state)];
  const groups = questions.map((q) => {
    const spans = q.options.map((o) => [OPT!, ...encUser(tokenizer, o), END!]);
    const branch = [Q!, ...encUser(tokenizer, q.instr), ...spans.flat(), DECIDE!];
    const base = tokens.length;
    let cursor = 1 + encUser(tokenizer, q.instr).length;
    const ends = spans.map((s) => {
      cursor += s.length;
      return base + cursor - 1;
    });
    tokens.push(...branch);
    return ends;
  });

  const { logits } = await model({
    input_ids: new Tensor("int64", BigInt64Array.from(tokens, BigInt), [1, tokens.length]),
    attention_mask: new Tensor("int64", new BigInt64Array(tokens.length).fill(1n), [1, tokens.length]),
  });
  const scores = Array.from((logits as Tensor).to("float32").data as Float32Array, Number);
  const softmax = (xs: number[]): number[] => {
    const m = Math.max(...xs);
    const e = xs.map((x) => Math.exp(x - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((x) => x / s);
  };
  return { answers: groups.map((ends) => softmax(ends.map((i) => scores[i]!))), tokenCount: tokens.length };
}

// ── THE PROBE (run directly) ─────────────────────────────────────────────────
if (import.meta.main) {
  const state = "I was charged twice for the same order and nobody answers my emails. I want my money back now.";
  const questions: KevQuestion[] = [
    { instr: "Which team should handle this ticket?", options: ["billing: Charges, refunds, invoices", "technical support: Bugs, outages, login problems", "sales", "account management"] },
    { instr: "Is the customer asking for a refund?", options: ["no", "yes"] },
    { instr: "How positive is the sentiment of this message?", options: ["very negative", "negative", "neutral", "positive", "very positive"] },
  ];
  const t0 = Date.now();
  const res = await kevDecide(state, questions);
  console.log(`[kev-probe] ★ THE MODEL DECIDED — ${res.tokenCount} tokens in ${Date.now() - t0}ms`);
  questions.forEach((q, i) => {
    const dist = res.answers[i]!;
    const best = dist.indexOf(Math.max(...dist));
    console.log(`  Q${i + 1}: ${q.instr}`);
    q.options.forEach((o, j) => console.log(`    ${(dist[j]! * 100).toFixed(1).padStart(5)}%  ${o}`));
    console.log(`    → ${q.options[best]}`);
  });
}

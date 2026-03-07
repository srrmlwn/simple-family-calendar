/**
 * Lightweight prompt injection guard — no external dependencies.
 *
 * Prompt injection in this app is low-severity (authenticated users, blast radius
 * limited to their own calendar), but we still want to detect and log attempts so
 * we can see attack patterns and harden further if needed.
 *
 * Strategy:
 *  - BLOCK: inputs that are clearly non-calendar adversarial payloads
 *  - FLAG:  inputs that look suspicious but could be legitimate calendar text
 *  - PASS:  everything else
 *
 * We deliberately don't strip/rewrite suspicious text — sanitization can silently
 * corrupt legitimate input. Block or pass, with logging.
 */

export type GuardVerdict = 'pass' | 'flag' | 'block';

export interface GuardResult {
    verdict: GuardVerdict;
    reason?: string;
    /** Normalised input (whitespace-collapsed, trimmed). Use this downstream. */
    sanitized: string;
}

// ---------------------------------------------------------------------------
// Pattern sets
// ---------------------------------------------------------------------------

/**
 * High-confidence injection patterns — these have no plausible calendar meaning.
 * Match → block.
 */
const BLOCK_PATTERNS: RegExp[] = [
    // Classic instruction override
    /ignore\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions?|prompts?|rules?|directives?|guidelines?)/i,
    /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|prompts?|rules?)/i,
    /forget\s+(everything|all)\s+(you\s+)?(were\s+)?(told|instructed|given)/i,
    /override\s+(your\s+)?(instructions?|directives?|system\s+prompt)/i,
    // System role injection via special tokens
    /<\s*\/?\s*system\s*>/i,
    /\[INST\]|\[\/INST\]|\[SYS\]|\[\/SYS\]/,
    /<<SYS>>|<\/SYS>/,
    // Asking the model to reveal its prompt
    /reveal\s+(your\s+)?(system\s+)?(prompt|instructions?|rules?|directives?)/i,
    /show\s+me\s+(your\s+)?(system\s+)?(prompt|instructions?)/i,
    /what\s+(are|were)\s+your\s+(instructions?|rules?|system\s+prompt)/i,
    // Role-switching
    /you\s+are\s+now\s+(a\s+)?(?!available|busy|free|at|in|going|coming|back)/i, // "you are now DAN" but not "you are now available"
    /pretend\s+(you\s+are|to\s+be)\s+(?!free|busy|available|at|in)/i,
    /act\s+as\s+(a\s+)?(?!the\s+reminder|a\s+calendar|my\s+assistant)/i,
    // Prompt delimiter injection
    /---+\s*(system|assistant|human|user)\s*:?\s*---+/i,
    /={3,}\s*(system|assistant|human|user)\s*:?\s*={3,}/i,
];

/**
 * Lower-confidence patterns — suspicious but could appear in legitimate input.
 * Match → flag (log but allow through).
 */
const FLAG_PATTERNS: RegExp[] = [
    // Jailbreak preambles
    /do\s+anything\s+now/i,
    /DAN\b/,                    // "Do Anything Now" jailbreak
    /jailbreak/i,
    /bypass\s+(your\s+)?(safety|restrictions?|filters?|guidelines?)/i,
    // Trying to exfiltrate context
    /repeat\s+(everything|all)\s+(above|before|prior)/i,
    /print\s+(your\s+)?(system|instructions?|prompt)/i,
    // Unusual instruction framing
    /\bnew\s+instructions?\s*:/i,
    /\bsystem\s+prompt\s*:/i,
    /\bassistant\s*:\s*(?:sure|of course|absolutely|yes)/i, // pre-filling assistant turn
    // Encoding tricks (base64 "ignore" etc.) — catch obvious ones
    /aWdub3Jl|aWdub3JlIGFsbA/,  // base64 "ignore" / "ignore all"
];

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

/**
 * Collapse Unicode homoglyphs and zero-width characters used to evade pattern matching.
 * We do minimal normalisation — just enough to catch trivial evasions.
 */
function normalise(input: string): string {
    return input
        // Strip zero-width / invisible Unicode
        .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
        // Collapse runs of whitespace (including non-breaking space)
        .replace(/[\u00A0\s]+/g, ' ')
        // Normalise Unicode to NFC (combines accented characters)
        .normalize('NFC')
        .trim();
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Checks a user-supplied NLP input string for prompt injection signals.
 *
 * @param raw  Raw user input from request body
 * @returns    GuardResult — always includes `sanitized` for downstream use
 */
export function checkPromptInjection(raw: string): GuardResult {
    const sanitized = normalise(raw);

    for (const pattern of BLOCK_PATTERNS) {
        if (pattern.test(sanitized)) {
            return {
                verdict: 'block',
                reason: `Blocked pattern: ${pattern.source.slice(0, 60)}`,
                sanitized,
            };
        }
    }

    for (const pattern of FLAG_PATTERNS) {
        if (pattern.test(sanitized)) {
            return {
                verdict: 'flag',
                reason: `Suspicious pattern: ${pattern.source.slice(0, 60)}`,
                sanitized,
            };
        }
    }

    return { verdict: 'pass', sanitized };
}

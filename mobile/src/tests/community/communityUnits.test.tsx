import { replyDepths, MAX_REPLY_DEPTH } from '@/components/forum/ReplyList';
import { detectMention } from '@/components/forum/MentionAutocomplete';
import {
  formatCardNumber,
  formatExpiry,
  luhnCheck,
  validateCard,
  validateCardNumber,
  validateCvv,
  validateExpiry,
} from '@/components/checkout/CardForm';
import { isValidCostCenter } from '@/components/checkout/CostCenterField';
import { buildFlagRows, deriveSeverity } from '@/hooks/useModeration';
import { parseInlineMarkdown, parseMarkdown } from '@/utils/markdown';
import { formatRelativeTime } from '@/utils/datetime';
import { computeTotals, defaultPlanId, formatINR } from '@/utils/pricing';
import { buildPlan, buildQueueItem, buildReply, buildReport, TEST_POLICY } from '@/tests/communityFixtures';
import type { DiscountValidation } from '@/types/community';

function discount(
  overrides: Partial<DiscountValidation> = {}
): DiscountValidation {
  return {
    valid: true,
    status: 'valid',
    message: '',
    discount: null,
    discountAmount: 0,
    ...overrides,
  };
}

describe('replyDepths', () => {
  it('nests replies under their parent', () => {
    const replies = [
      buildReply({ id: 'a', parentId: null }),
      buildReply({ id: 'b', parentId: 'a' }),
      buildReply({ id: 'c', parentId: 'b' }),
    ];

    const depths = replyDepths(replies);
    expect(depths.get('a')).toBe(0);
    expect(depths.get('b')).toBe(1);
    expect(depths.get('c')).toBe(2);
  });

  it('caps indentation at MAX_REPLY_DEPTH for deep chains', () => {
    const replies = [
      buildReply({ id: 'a', parentId: null }),
      buildReply({ id: 'b', parentId: 'a' }),
      buildReply({ id: 'c', parentId: 'b' }),
      buildReply({ id: 'd', parentId: 'c' }),
      buildReply({ id: 'e', parentId: 'd' }),
      buildReply({ id: 'f', parentId: 'e' }),
    ];

    const depths = replyDepths(replies);
    expect(depths.get('f')).toBe(MAX_REPLY_DEPTH);
  });

  it('treats an orphaned parent as a root reply', () => {
    const depths = replyDepths([buildReply({ id: 'x', parentId: 'missing' })]);
    expect(depths.get('x')).toBe(0);
  });
});

describe('severity derivation', () => {
  it('derives low / medium / high from the policy thresholds', () => {
    expect(deriveSeverity(0, TEST_POLICY)).toBe('low');
    expect(deriveSeverity(1, TEST_POLICY)).toBe('low');
    expect(deriveSeverity(2, TEST_POLICY)).toBe('medium');
    expect(deriveSeverity(4, TEST_POLICY)).toBe('high');
    expect(deriveSeverity(99, TEST_POLICY)).toBe('high');
  });

  it('joins reports by content id and type', () => {
    const rows = buildFlagRows(
      [
        buildQueueItem({ id: 't-9', type: 'discussion' }),
        buildQueueItem({ id: 'c-1', type: 'comment', title: 'Reply' }),
      ],
      [
        buildReport({ contentId: 't-9', contentType: 'discussion' }),
        buildReport({ contentId: 't-9', contentType: 'discussion', id: 'rp-2' }),
        buildReport({ contentId: 'c-1', contentType: 'comment', id: 'rp-3' }),
        // Same id, different content type — must not leak across.
        buildReport({ contentId: 'c-1', contentType: 'discussion', id: 'rp-4' }),
      ],
      TEST_POLICY
    );

    expect(rows[0]!.reportCount).toBe(2);
    expect(rows[0]!.severity).toBe('medium');
    expect(rows[1]!.reportCount).toBe(1);
    expect(rows[1]!.severity).toBe('low');
  });
});

describe('pricing maths', () => {
  it('applies 18% GST to the discounted amount', () => {
    const totals = computeTotals(1000, null);
    expect(totals).toEqual({
      subtotal: 1000,
      discountAmount: 0,
      gst: 180,
      total: 1180,
    });
  });

  it('subtracts a valid discount before taxing', () => {
    const totals = computeTotals(1000, discount({ discountAmount: 200 }));
    expect(totals.discountAmount).toBe(200);
    expect(totals.gst).toBe(144);
    expect(totals.total).toBe(944);
  });

  it('ignores an invalid discount and clamps one above the subtotal', () => {
    expect(
      computeTotals(500, discount({ valid: false, status: 'expired', discountAmount: 100 }))
        .discountAmount
    ).toBe(0);
    expect(
      computeTotals(500, discount({ discountAmount: 9999 })).discountAmount
    ).toBe(500);
  });

  it('formats rupees with Indian grouping', () => {
    expect(formatINR(1180)).toBe('₹1,180');
    expect(formatINR(123456.789)).toBe('₹1,23,456.79');
  });

  it('picks the recommended plan, else the first', () => {
    const plans = [buildPlan({ id: 'a' }), buildPlan({ id: 'b', recommended: true })];
    expect(defaultPlanId(plans)).toBe('b');
    expect(defaultPlanId([buildPlan({ id: 'a' })])).toBe('a');
    expect(defaultPlanId([])).toBe('');
  });
});

describe('card validation', () => {
  it('accepts the Luhn-valid test number and rejects a broken digit', () => {
    expect(luhnCheck('4242424242424242')).toBe(true);
    expect(luhnCheck('4242424242424241')).toBe(false);
    expect(validateCardNumber('4242 4242 4242 4242')).toBe(true);
    expect(validateCardNumber('1234')).toBe(false);
  });

  it('validates expiry months against the current date', () => {
    const now = new Date('2026-10-07T00:00:00.000Z');
    expect(validateExpiry('12/30', now)).toBe(true);
    expect(validateExpiry('09/26', now)).toBe(false);
    expect(validateExpiry('13/30', now)).toBe(false);
    expect(validateExpiry('ab/cd', now)).toBe(false);
  });

  it('validates CVV by length', () => {
    expect(validateCvv('123')).toBe(true);
    expect(validateCvv('1234')).toBe(true);
    expect(validateCvv('12')).toBe(false);
    expect(validateCvv('abc')).toBe(false);
  });

  it('reports every invalid field of a card', () => {
    expect(validateCard({ number: '1234', expiry: '', cvv: '', name: '' })).toEqual({
      number: 'Enter a valid card number (Luhn check).',
      expiry: 'Use MM/YY in the future.',
      cvv: '3 or 4 digits.',
      name: 'Name on card is required.',
    });
    expect(
      validateCard({
        number: '4242424242424242',
        expiry: '12/30',
        cvv: '123',
        name: 'PREMA N',
      })
    ).toEqual({});
  });

  it('groups digits and rewrites expiry as MM/YY', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatExpiry('122')).toBe('12/2');
    expect(formatExpiry('1230')).toBe('12/30');
  });
});

describe('cost centre', () => {
  it('accepts AB-1234 and rejects malformed values (empty = optional)', () => {
    expect(isValidCostCenter('AB-1234')).toBe(true);
    expect(isValidCostCenter('')).toBe(true);
    expect(isValidCostCenter('ab-1234')).toBe(false);
    expect(isValidCostCenter('AB-123')).toBe(false);
  });
});

describe('markdown parser', () => {
  it('splits headings, paragraphs and bullets (code fences stay text)', () => {
    const blocks = parseMarkdown(
      '# Title\n\nFirst paragraph with **bold**.\n- one\n- two'
    );
    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'bullet',
      'bullet',
    ]);
  });

  it('tokenises inline bold, italic, code and links', () => {
    const tokens = parseInlineMarkdown(
      'use `useState` with **care** and _style_ [docs](https://example.com)'
    );
    const kinds = tokens.map((token) => token.type);
    expect(kinds).toEqual(['text', 'code', 'text', 'bold', 'text', 'italic', 'text', 'link']);
  });

  it('returns the input as plain text when nothing matches', () => {
    expect(parseInlineMarkdown('plain words')).toEqual([
      { type: 'text', value: 'plain words' },
    ]);
  });
});

describe('detectMention', () => {
  it('detects a mention at the caret after whitespace', () => {
    expect(detectMention('thanks @pre', 11)).toEqual({ query: 'pre', start: 7 });
    expect(detectMention('@', 1)).toEqual({ query: '', start: 0 });
  });

  it('returns null outside a mention token', () => {
    expect(detectMention('mail me at a@b.com', 17)).toBeNull();
    expect(detectMention('no mention here', 15)).toBeNull();
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-07T12:00:00.000Z');

  it('describes minutes, hours and days ago', () => {
    expect(formatRelativeTime('2026-10-07T11:58:00.000Z', now)).toBe('2m ago');
    expect(formatRelativeTime('2026-10-07T09:00:00.000Z', now)).toBe('3h ago');
    expect(formatRelativeTime('2026-10-05T12:00:00.000Z', now)).toBe('2d ago');
  });

  it('falls back to the date for old content', () => {
    expect(formatRelativeTime('2025-01-02T12:00:00.000Z', now)).toContain('2025');
  });
});

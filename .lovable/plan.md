## Changes to `src/lib/documentUtils.ts`

1. **PDF page margins → 1cm all sides**
   - Change `const margin = 10;` (currently 10mm = 1cm — already correct in value but inconsistent with content padding).
   - Reduce `.pdf-root` CSS `padding: 40px` to `padding: 0` so the jsPDF 10mm margin is the only outer spacing (currently we get both 40px inner padding AND 10mm PDF margin, making content feel inset).
   - Keep `margin = 10` (10mm = 1cm) in jsPDF for top/bottom/left/right.

2. **Larger logo**
   - `.logo` CSS: `width: 60px; height: 60px;` → `width: 100px; height: 100px;`
   - `.business-name` stays the same.

No other behavior changes. No DB or sync changes.
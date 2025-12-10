import { db } from '../lib/firebase/config';
import { doc, deleteDoc } from 'firebase/firestore';

async function clearRankingsCache() {
  try {
    // Clear Week 14 cache (current week shown on rankings page)
    const week14Ref = doc(db, 'team_rankings', '2025-w14');
    await deleteDoc(week14Ref);
    console.log('✅ Deleted cached rankings for Week 14');

    // Clear Week 13 too (needed for trends)
    const week13Ref = doc(db, 'team_rankings', '2025-w13');
    await deleteDoc(week13Ref);
    console.log('✅ Deleted cached rankings for Week 13');

    console.log('\n✅ Cache cleared! Rankings will recalculate on next page load.');
  } catch (error: any) {
    console.error('Error clearing cache:', error);
  }
}

clearRankingsCache().catch(console.error);

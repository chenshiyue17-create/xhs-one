import { getCategoryLabel, type CategoryKey } from '../../config/site';

interface CategoryPillProps {
  category: CategoryKey;
  active?: boolean;
}

export function CategoryPill({ category, active = false }: CategoryPillProps) {
  return (
    <span className={`category-pill${active ? ' active' : ''}`}>{getCategoryLabel(category)}</span>
  );
}

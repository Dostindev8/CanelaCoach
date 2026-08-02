import { ActionButton } from './ActionButton';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

/** Outline prev/next + "Página X / Y" — Clientes pagination pattern. */
export function Pagination({ currentPage, totalPages, onPrev, onNext }: PaginationProps) {
  const total = Math.max(1, totalPages);
  const page = Math.min(Math.max(1, currentPage), total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ActionButton
        variant="ghost"
        label="← Anterior"
        disabled={page <= 1}
        onClick={onPrev}
        className="text-sm"
      />
      <p className="panel-muted text-sm">
        Página {page} / {total}
      </p>
      <ActionButton
        variant="ghost"
        label="Siguiente →"
        disabled={page >= total}
        onClick={onNext}
        className="text-sm"
      />
    </div>
  );
}

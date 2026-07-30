import { cn } from '../../lib/cn';

export function DividerWithText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 w-full', className)} role="separator" aria-label={text}>
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="whitespace-nowrap font-sans text-xs text-text-secondary sm:text-sm">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}

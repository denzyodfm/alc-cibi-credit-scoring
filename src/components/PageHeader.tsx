export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold text-ink sm:text-2xl">{title}</h1>
        {description ? <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

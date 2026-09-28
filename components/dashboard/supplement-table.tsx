import type { Supplement } from "@/types/bloodwork";

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function SupplementTable({
  supplements,
}: {
  supplements: Supplement[];
}) {
  return (
    <div>
      <div>
        <table className="supplement-table w-full text-sm">
          <caption className="sr-only">Current active supplements</caption>
          <thead>
            <tr className="text-muted text-xs font-semibold tracking-[0.07em] uppercase">
              <th scope="col" className="pb-3 text-left">
                Supplement
              </th>
              <th scope="col" className="pb-3 text-left">
                Dose
              </th>
              <th scope="col" className="pb-3 text-left">
                Frequency
              </th>
              <th scope="col" className="pb-3 text-left">
                Since
              </th>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {supplements.map((s) => (
              <tr key={s.id} className="sm:border-t sm:border-zinc-900/8">
                <td className="sm:py-3 sm:font-medium">{s.name}</td>
                <td className="data-value text-zinc-700 sm:py-3">{s.dose}</td>
                <td className="text-zinc-600 sm:py-3">{s.frequency}</td>
                <td className="data-value text-muted sm:py-3">
                  {formatMonth(s.startedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

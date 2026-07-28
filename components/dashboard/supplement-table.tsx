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
            <tr className="text-[0.68rem] font-semibold tracking-[0.07em] text-zinc-500 uppercase">
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
              <tr key={s.id} className="border-t border-zinc-900/8">
                <td className="py-3 font-medium">{s.name}</td>
                <td className="data-value py-3 text-zinc-700">{s.dose}</td>
                <td className="py-3 text-zinc-600">{s.frequency}</td>
                <td className="data-value py-3 text-zinc-500">
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

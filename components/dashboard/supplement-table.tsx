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
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
              <td className="pb-2">Supplement</td>
              <td className="pb-2">Dose</td>
              <td className="pb-2">Frequency</td>
              <td className="pb-2">Since</td>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {supplements.map((s) => (
              <tr key={s.id} className="border-t border-zinc-100">
                <td className="py-2">{s.name}</td>
                <td className="py-2 text-zinc-600">{s.dose}</td>
                <td className="py-2 text-zinc-600">{s.frequency}</td>
                <td className="py-2 text-zinc-500">
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

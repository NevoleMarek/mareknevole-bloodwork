import type { Supplement } from "@/types/bloodwork";
import {
  formatSupplementMonth,
  supplementSafetyValue,
} from "@/lib/supplements";

export function SupplementTable({
  supplements,
}: {
  supplements: Supplement[];
}) {
  return (
    <div className="space-y-4">
      <p
        role="note"
        className="rounded-xl border border-amber-900/10 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-950/75"
      >
        <strong className="font-semibold text-amber-950">
          Personal log, not medical advice.
        </strong>{" "}
        This records one person&apos;s supplements and does not recommend them
        for anyone else. Interaction, contraindication, and clinician-review
        details may be incomplete; check with a clinician or pharmacist before
        starting or changing a supplement.
      </p>
      <div>
        <table className="supplement-table w-full text-sm">
          <caption className="sr-only">
            Personal supplement log; not medical advice
          </caption>
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
              <th scope="col" className="pb-3 text-left">
                Safety context
              </th>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {supplements.length === 0 ? (
              <tr className="border-t border-zinc-900/8">
                <td colSpan={5} className="py-4 text-zinc-500">
                  No currently active supplements are recorded.
                </td>
              </tr>
            ) : (
              supplements.map((s) => (
                <tr key={s.id} className="border-t border-zinc-900/8">
                  <td className="py-3 font-medium">{s.name}</td>
                  <td className="data-value py-3 text-zinc-700">{s.dose}</td>
                  <td className="py-3 text-zinc-600">{s.frequency}</td>
                  <td className="data-value py-3 text-zinc-500">
                    {formatSupplementMonth(s.startedAt)}
                  </td>
                  <td className="py-3 text-xs leading-5 text-zinc-600">
                    <dl>
                      <div>
                        <dt className="inline font-semibold text-zinc-700">
                          Ingredient/form:{" "}
                        </dt>
                        <dd className="inline">
                          {supplementSafetyValue(s.ingredientForm)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-zinc-700">
                          Interactions:{" "}
                        </dt>
                        <dd className="inline">
                          {supplementSafetyValue(s.interactionNotes)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-zinc-700">
                          Contraindications:{" "}
                        </dt>
                        <dd className="inline">
                          {supplementSafetyValue(s.contraindicationNotes)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-zinc-700">
                          Clinician/pharmacist review:{" "}
                        </dt>
                        <dd className="inline">
                          {supplementSafetyValue(s.clinicianReview)}
                        </dd>
                      </div>
                    </dl>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

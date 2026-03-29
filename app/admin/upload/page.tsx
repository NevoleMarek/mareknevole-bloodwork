import { UploadWizard } from "@/components/admin/upload-wizard";

export default function UploadPage() {
  return (
    <section>
      <h2 className="mb-4 text-[9px] tracking-[2px] text-zinc-400 uppercase">
        Upload Reading
      </h2>
      <UploadWizard />
    </section>
  );
}

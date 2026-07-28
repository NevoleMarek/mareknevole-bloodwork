import { UploadWizard } from "@/components/admin/upload-wizard";

export default function UploadPage() {
  return (
    <>
      <div className="admin-page-title">
        <p className="eyebrow">New lab panel</p>
        <h1 className="mt-2">Upload reading</h1>
        <p>Extract, review, and save biomarker data from a PDF report.</p>
      </div>
      <section className="admin-panel">
        <UploadWizard />
      </section>
    </>
  );
}
